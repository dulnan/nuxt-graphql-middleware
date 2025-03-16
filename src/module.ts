import type { ViteDevServer, WebSocketServer } from 'vite'
import { fileURLToPath } from 'url'
import { defu } from 'defu'
import { type BirpcGroup } from 'birpc'
import {
  defineNuxtModule,
  addServerHandler,
  addTemplate,
  addPlugin,
  addImports,
  addServerImports,
  addTypeTemplate,
  addServerTemplate,
  useNitro,
} from '@nuxt/kit'
import { extendServerRpc, onDevToolsInitialized } from '@nuxt/devtools-kit'
import { name, version } from '../package.json'
import { setupDevToolsUI } from './devtools'
import { Template } from './runtime/settings'
import type { Nitro } from 'nitropack'
import { defaultOptions, inlineNitroExternals, logger } from './helpers'
import { type ClientFunctions, type ServerFunctions } from './rpc-types'
import { Collector } from './module/Collector'
import type { HookResult, ResolvedNuxtTemplate, WatchEvent } from 'nuxt/schema'
import type { OperationResponseError } from './runtime/types'
import { SchemaProvider } from './module/SchemaProvider'
import type { ModuleOptions } from './module/types/options'
import { ModuleHelper } from './module/ModuleHelper'
import GraphqlConfig from './module/templates/GraphqlConfig'
import DocumentTypes from './module/templates/DocumentTypes'
import Types from './module/templates/Types'
import HelpersTypes from './module/templates/HelpersTypes'
import Helpers from './module/templates/Helpers'
import ServerOptions from './module/templates/ServerOptions'
import ServerOptionsTypes from './module/templates/ServerOptionsTypes'
import ClientOptions from './module/templates/ClientOptions'
import ClientOptionsTypes from './module/templates/ClientOptionsTypes'
export type { GraphqlMiddlewareServerOptions } from './types'

export interface ModuleHooks {}

const RPC_NAMESPACE = 'nuxt-graphql-middleware'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey: 'graphqlMiddleware',
    version,
    compatibility: {
      nuxt: '>=3.15.0',
    },
  },
  defaults: defaultOptions,
  async setup(passedOptions, nuxt) {
    const helper = new ModuleHelper(nuxt, import.meta.url, passedOptions)

    // =========================================================================
    // GraphQL schema and documents
    // =========================================================================

    const schemaProvider = new SchemaProvider(helper)
    await schemaProvider.init()

    const collector = new Collector(schemaProvider.getSchema(), helper)
    await collector.init()

    // =========================================================================
    // Runtime, App Config, Hacks
    // =========================================================================

    nuxt.options.appConfig.graphqlMiddleware = {
      clientCacheEnabled: !!helper.options.clientCache?.enabled,
      clientCacheMaxSize: helper.options.clientCache?.maxSize ?? 100,
    }

    nuxt.options.runtimeConfig.graphqlMiddleware = {
      graphqlEndpoint: helper.options.graphqlEndpoint || '',
    }

    nuxt.options.build.transpile.push(
      fileURLToPath(new URL('./runtime', import.meta.url)),
    )

    // Not exactly sure why this is needed, but without it, the server build fails.
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.externals = defu(
        typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {},
        {
          inline: [helper.resolvers.module.resolve('./runtime')],
        },
      )
    })

    // =========================================================================
    // Aliases
    // =========================================================================

    helper.addAlias('#nuxt-graphql-middleware', helper.moduleBuildDir)
    helper.addAlias('#graphql-operations', helper.moduleOperationTypesDir)

    // =========================================================================
    // Plugins
    // =========================================================================

    addPlugin(
      helper.resolvers.module.resolve('./runtime/plugins/provideState'),
      {
        append: false,
      },
    )

    if (helper.isDev && helper.options.errorOverlay) {
      addPlugin(helper.resolvers.module.resolve('./runtime/plugins/devMode'), {
        append: false,
      })
    }

    // =========================================================================
    // Server Handlers
    // =========================================================================

    // Add the server API handler.
    addServerHandler({
      handler: helper.resolvers.module.resolve('./runtime/serverHandler/index'),
      route: helper.options.serverApiPrefix + '/:operation/:name',
    })

    if (helper.options.enableFileUploads) {
      addServerHandler({
        handler: helper.resolvers.module.resolve(
          './runtime/serverHandler/upload',
        ),
        route: helper.options.serverApiPrefix + '/upload/:name',
      })
    }

    if (helper.isDev) {
      addServerHandler({
        handler: helper.resolvers.module.resolve(
          './runtime/serverHandler/debug',
        ),
        route: helper.options.serverApiPrefix + '/debug',
      })
    }

    // =========================================================================
    // Composables & Server Utils
    // =========================================================================

    if (helper.options.includeComposables) {
      const nuxtComposables = [
        'useGraphqlQuery',
        'useGraphqlMutation',
        'useGraphqlState',
        'useAsyncGraphqlQuery',
      ]

      if (helper.options.enableFileUploads) {
        nuxtComposables.push('useGraphqlUploadMutation')
      }

      nuxtComposables.forEach((name) => {
        addImports({
          from: helper.resolvers.module.resolve(
            './runtime/composables/' + name,
          ),
          name,
        })
      })

      const serverUtils = ['useGraphqlQuery', 'useGraphqlMutation'].map(
        (name) => {
          return {
            from: helper.resolvers.module.resolve(
              './runtime/server/utils/' + name,
            ),
            name,
          }
        },
      )
      addServerImports(serverUtils)
    }

    // =========================================================================
    // Templates
    // =========================================================================

    /**
     * Adds a template with the contents of the provided callback.
     */
    function addTemplateOnce(
      template: Template,
      cb: (() => string) | string,
      opts?: { inlineNitro?: boolean },
    ): ResolvedNuxtTemplate<any> {
      // Run the callback only once, since the template does not depend on
      // any state that might change during dev.
      const content = typeof cb === 'function' ? cb() : cb
      if (template.endsWith('d.ts')) {
        return addTypeTemplate({
          filename: template as `${string}.d.ts`,
          write: true,
          getContents: () => content,
        })
      }
      const resolvedTemplate = addTemplate({
        filename: template,
        write: true,
        getContents: () => content,
      })

      if (opts?.inlineNitro) {
        inlineNitroExternals(nuxt, resolvedTemplate.dst)
      }
      return resolvedTemplate
    }

    /**
     * Adds a dynamic collector type template.
     */
    function addCollectorTypeTemplate(template: Template) {
      addTypeTemplate(
        {
          filename: template as any,
          write: true,
          getContents: () => collector.getTemplate(template),
        },
        {
          nuxt: true,
          nitro: true,
        },
      )
    }

    /**
     * Adds a dynamic collector template.
     */
    function addCollectorTemplate(template: Template) {
      addTemplate({
        filename: template,
        write: true,
        getContents: () => collector.getTemplate(template),
      })
    }

    /**
     * Adds a virtual template for both Nuxt and Nitro.
     *
     * For some reason a template written to disk works for both Nuxt and Nitro,
     * but a virtual template requires adding two templates.
     */
    function addVirtualCollectorTemplate(template: Template) {
      const getContents = () => collector.getTemplate(template)

      addTemplate({
        filename: template,
        getContents,
      })

      addServerTemplate({
        // Since this is a virtual template, the name must match the final
        // alias, example:
        // - nuxt-graphql-middleware/foobar.mjs => #nuxt-graphql-middleware/foobar
        //
        // That way we can reference the same template using the alias in both
        // Nuxt and Nitro environments.
        filename: '#' + template.replace('.mjs', ''),
        getContents,
      })
    }

    // Static templates that only need to be built once, since they don't depend
    // on collected GraphQL documents.
    addTemplateOnce(Template.GraphqlConfig, GraphqlConfig(helper))
    addTemplateOnce(Template.DocumentTypes, DocumentTypes())
    addTemplateOnce(Template.Types, Types())
    addTemplateOnce(Template.HelpersTypes, HelpersTypes())
    addTemplateOnce(Template.Helpers, Helpers(helper))
    addTemplateOnce(Template.ServerOptions, ServerOptions(helper), {
      inlineNitro: true,
    })
    addTemplateOnce(Template.ServerOptionsTypes, ServerOptionsTypes(helper))
    addTemplateOnce(Template.ClientOptions, ClientOptions(helper))
    addTemplateOnce(Template.ClientOptionsTypes, ClientOptionsTypes(helper))

    // Templates that depend on collected GraphQL documents.
    // Their contents are provided by the Collector and updated on watch event.
    addCollectorTypeTemplate(Template.OperationTypes)
    addCollectorTypeTemplate(Template.OperationTypesAll)
    addCollectorTypeTemplate(Template.NitroTypes)
    addCollectorTypeTemplate(Template.ResponseTypes)
    addCollectorTemplate(Template.Enums)
    addCollectorTemplate(Template.OperationSources)
    addVirtualCollectorTemplate(Template.Documents)

    // =========================================================================
    // Dev Mode
    // =========================================================================

    if (!helper.isDev) {
      return
    }

    /** The RPC instance for the module's dev tools. */
    let devToolsRpc: BirpcGroup<ClientFunctions, ServerFunctions> | undefined

    /** The nitro app. */
    let nitro: Nitro | null = null

    /** The Vite WebSocket server. */
    let viteWebSocket: WebSocketServer | null = null

    /** Names of operations for which we need to trigger a HMR event. */
    const operationsToReload: Set<string> = new Set()

    function onReady() {
      nitro = useNitro()
      // Event emitted when the Nitro server has finished compiling.
      nitro.hooks.hook('compiled', onNitroCompiled)
    }

    function onViteServerCreated(server: ViteDevServer) {
      viteWebSocket = server.ws
    }

    if (helper.options.devtools) {
      const clientPath = helper.resolvers.module.resolve('./client')
      setupDevToolsUI(nuxt, clientPath)

      onDevToolsInitialized(() => {
        devToolsRpc = extendServerRpc<ClientFunctions, ServerFunctions>(
          RPC_NAMESPACE,
          {
            // register server RPC functions
            getModuleOptions() {
              return helper.options
            },
            getDocuments() {
              return [...collector.rpcItems.values()]
            },
          },
        )
      })
    }

    function sendError(error: { message: string }) {
      if (!viteWebSocket) {
        return
      }
      viteWebSocket.send({
        type: 'error',
        err: {
          message: error.message,
          stack: '',
        },
      })
    }

    function onNitroCompiled() {
      if (!operationsToReload.size) {
        return
      }

      // Get all operations that need to be reloaded.
      const operations = [...operationsToReload.values()]
      operationsToReload.clear()

      // Send the HMR event to trigger refreshing in useAsyncGraphqlQuery.
      if (!viteWebSocket) {
        return
      }
      viteWebSocket.send({
        type: 'custom',
        event: 'nuxt-graphql-middleware:reload',
        data: { operations },
      })
    }

    async function onBuilderWatch(event: WatchEvent, pathAbsolute: string) {
      // Skip the GraphQL schema itself.
      if (pathAbsolute === helper.paths.schema) {
        return
      }

      // We only care about GraphQL files.
      if (!pathAbsolute.match(/\.(gql|graphql)$/)) {
        return
      }

      // Cancel existing prompts.
      helper.prompt.abort()

      const { hasChanged, affectedOperations, error } =
        await collector.handleWatchEvent(event, pathAbsolute)

      if (error) {
        sendError(error)
        await helper.prompt
          .confirm('Do you want to download and update the GraphQL schema?')
          .then(async (shouldReload) => {
            if (shouldReload !== 'yes') {
              return
            }
            try {
              await schemaProvider.loadSchema({ forceDownload: true })
              await collector.updateSchema(schemaProvider.getSchema())
            } catch (e) {
              logger.error(e)
            }
          })
        return
      }

      if (!hasChanged) {
        return
      }

      if (nitro) {
        // Unfortunately this is the only way currently to make sure that
        // the operations are rebuilt, as Nitro does not provide any way
        // to update templates.
        await nitro.hooks.callHook('rollup:reload')
      }

      if (affectedOperations.length) {
        affectedOperations.forEach((operation) =>
          operationsToReload.add(operation),
        )
      }

      if (devToolsRpc) {
        // Update the documents for the dev tools.
        // For some reason this sometimes throws an error which results in a Nuxt restart.
        try {
          devToolsRpc.broadcast.documentsUpdated([
            ...collector.rpcItems.values(),
          ])
        } catch {
          logger.info(
            'Failed to update GraphQL documents in dev tools. The documents might be stale.',
          )
        }
      }
    }

    nuxt.hooks.hook('ready', onReady)
    nuxt.hook('builder:watch', onBuilderWatch)
    nuxt.hooks.hook('vite:serverCreated', onViteServerCreated)
  },
})

export type { ModuleOptions }

declare module '@nuxt/schema' {
  interface AppConfig {
    graphqlMiddleware: {
      /**
       * Whether the client cache is enabled.
       */
      clientCacheEnabled: boolean

      /**
       * The max number of items in the cache.
       */
      clientCacheMaxSize: number
    }
  }
}

declare module '#app' {
  interface RuntimeNuxtHooks {
    /**
     * Emitted when any GraphQL response contains errors.
     */
    'nuxt-graphql-middleware:errors': (
      errors: OperationResponseError,
    ) => HookResult
  }
}

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    /**
     * Emitted when GraphQL operations have been updated.
     */
    'nuxt-graphql-middleware:reload': { operations: string[] }
  }
}
