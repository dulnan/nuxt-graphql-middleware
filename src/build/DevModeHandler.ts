import type { Nuxt, WatchEvent } from 'nuxt/schema'
import type { SchemaProvider } from './SchemaProvider'
import type { Collector } from './Collector'
import type { ModuleHelper } from './ModuleHelper'
import type { BirpcGroup } from 'birpc'
import type { ClientFunctions, ServerFunctions } from './types/rpc'
import type { Nitro } from 'nitropack'
import type { ViteDevServer, WebSocketServer } from 'vite'
import { dirname } from 'node:path'
import { useNitro } from '@nuxt/kit'
import { relative } from 'pathe'
import { logger } from './helpers'
import { setupDevToolsUI } from './devtools'
import { extendServerRpc, onDevToolsInitialized } from '@nuxt/devtools-kit'

const RPC_NAMESPACE = 'nuxt-graphql-middleware'

export class DevModeHandler {
  private devToolsRpc: BirpcGroup<ClientFunctions, ServerFunctions> | null =
    null
  private nitro: Nitro | null = null
  private viteWebSocket: WebSocketServer | null = null

  private operationsToReload: Set<string> = new Set()

  private emitBroadcastEventTimeout: NodeJS.Timeout | null = null

  constructor(
    private nuxt: Nuxt,
    private schemaProvider: SchemaProvider,
    private collector: Collector,
    private helper: ModuleHelper,
  ) {}

  public init() {
    this.nuxt.hooks.hookOnce('ready', this.onReady.bind(this))
    this.nuxt.hooks.hookOnce(
      'vite:serverCreated',
      this.onViteServerCreated.bind(this),
    )
    this.nuxt.hook('builder:watch', this.onBuilderWatch.bind(this))

    // The additional paths that need to be watched by Nuxt.
    // Without this, GraphQL documents that are not in the "app" folder will
    // not update if changed.
    // Not sure if this is a bug or expected behaviour.
    // @see https://github.com/nuxt/nuxt/issues/33827
    const additionalFoldersToWatch = this.getAdditionalWatchFolders()
    this.helper.nuxt.options.watch.push(...additionalFoldersToWatch)

    if (this.helper.options.devtools) {
      const clientPath = this.helper.resolvers.module.resolve('./client')
      setupDevToolsUI(this.nuxt, clientPath)

      onDevToolsInitialized(() => {
        this.devToolsRpc = extendServerRpc<ClientFunctions, ServerFunctions>(
          RPC_NAMESPACE,
          {
            // register server RPC functions
            getModuleOptions: () => {
              return this.helper.options
            },
            getDocuments: () => {
              return [...this.collector.rpcItems.values()]
            },
          },
        )
      })
    }
  }

  private onReady() {
    this.nitro = useNitro()
    // Event emitted when the Nitro server has finished compiling.
    this.nitro.hooks.hook('compiled', this.onNitroCompiled.bind(this))
  }

  async onBuilderWatch(event: WatchEvent, providedFilePath: string) {
    // We only care about GraphQL files.
    if (
      !providedFilePath.endsWith('.graphql') &&
      !providedFilePath.endsWith('.gql')
    ) {
      return
    }

    // Hack: This is supposed to be absolute. But it's not. Sometimes.
    // Let's make sure it's really absolute. We have to assume that the path
    // is actually relative to the source directory. If not, HMR will be
    // broken.
    const pathAbsolute = providedFilePath.startsWith('/')
      ? providedFilePath
      : this.helper.resolvers.src.resolve(providedFilePath)

    // Skip the GraphQL schema itself.
    if (pathAbsolute === this.helper.paths.schema) {
      return
    }

    // Cancel existing prompts.
    this.helper.prompt.abort()

    const { hasChanged, affectedOperations, error } =
      await this.collector.handleWatchEvent(event, pathAbsolute)

    if (error) {
      this.sendError(error)
      await this.helper.prompt
        .confirm('Do you want to download and update the GraphQL schema?')
        .then(async (shouldReload) => {
          if (shouldReload !== 'yes') {
            return
          }
          try {
            await this.schemaProvider.loadSchema({ forceDownload: true })
            await this.collector.updateSchema(this.schemaProvider.getSchema())
          } catch (e) {
            logger.error(e)
          }
        })
      return
    }

    if (!hasChanged) {
      return
    }

    if (this.nitro) {
      // Unfortunately this is the only way currently to make sure that
      // the operations are rebuilt, as Nitro does not provide any way
      // to update templates.
      await this.nitro.hooks.callHook('rollup:reload')
    }

    if (affectedOperations.length) {
      affectedOperations.forEach((operation) =>
        this.operationsToReload.add(operation),
      )
    }

    if (this.devToolsRpc) {
      if (this.emitBroadcastEventTimeout) {
        globalThis.clearTimeout(this.emitBroadcastEventTimeout)
      }

      // For some reason this sometimes throws an error which results in a Nuxt restart.
      // As a workaround, we need to delay sending the message.
      this.emitBroadcastEventTimeout = globalThis.setTimeout(() => {
        if (!this.devToolsRpc) {
          return
        }

        // Update the documents for the dev tools.
        try {
          this.devToolsRpc.broadcast.documentsUpdated([
            ...this.collector.rpcItems.values(),
          ])
        } catch {
          logger.info(
            'Failed to update GraphQL documents in dev tools. The documents might be stale.',
          )
        }
      }, 1000)
    }
  }

  private onViteServerCreated(server: ViteDevServer) {
    this.viteWebSocket = server.ws
  }

  private sendError(error: { message: string }) {
    if (!this.viteWebSocket) {
      return
    }
    this.viteWebSocket.send({
      type: 'error',
      err: {
        message: error.message,
        stack: '',
      },
    })
  }

  private onNitroCompiled() {
    if (!this.operationsToReload.size) {
      return
    }

    // Get all operations that need to be reloaded.
    const operations = [...this.operationsToReload.values()]
    this.operationsToReload.clear()

    // Send the HMR event to trigger refreshing in useAsyncGraphqlQuery.
    if (!this.viteWebSocket) {
      return
    }
    this.viteWebSocket.send({
      type: 'custom',
      event: 'nuxt-graphql-middleware:reload',
      data: { operations },
    })
  }

  /**
   * Get additional folders that need to be watched.
   */
  private getAdditionalWatchFolders(): string[] {
    const folders = new Set<string>()
    const srcDir = this.helper.nuxt.options.srcDir
    const rootDir = this.helper.nuxt.options.rootDir

    for (const pattern of this.helper.options.autoImportPatterns) {
      // Skip negation patterns.
      if (pattern.startsWith('!')) {
        continue
      }

      // Find first glob character position.
      const match = pattern.match(/[*?{[]/)
      if (!match || match.index === undefined) {
        // No glob characters, use dirname of the pattern.
        folders.add(dirname(pattern))
      } else {
        // Get path before glob and extract its dirname.
        const pathBeforeGlob = pattern.slice(0, match.index)
        const folder = pathBeforeGlob.endsWith('/')
          ? pathBeforeGlob.slice(0, -1)
          : dirname(pathBeforeGlob)
        if (folder && folder !== '.') {
          folders.add(folder)
        }
      }
    }

    return [...folders]
      .filter((folder) => {
        return !folder.startsWith(srcDir) && folder !== rootDir
      })
      .map((folder) => {
        return relative(srcDir, folder)
      })
  }
}
