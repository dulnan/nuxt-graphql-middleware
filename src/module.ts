import type { WebSocketServer } from 'vite'
import { fileURLToPath } from 'url'
import type { Types } from '@graphql-codegen/plugin-helpers'
import { type SchemaASTConfig } from '@graphql-codegen/schema-ast'
import { relative } from 'pathe'
import { defu } from 'defu'
import { type BirpcGroup } from 'birpc'
import { type GeneratorOptions } from 'graphql-typescript-deluxe'
import {
  defineNuxtModule,
  addServerHandler,
  createResolver,
  addTemplate,
  addPlugin,
  addImports,
  resolveAlias,
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
import { validateOptions, defaultOptions, logger, fileExists } from './helpers'
import { type ClientFunctions, type ServerFunctions } from './rpc-types'
import { Collector } from './module/Collector'
import type { HookResult, Nuxt } from 'nuxt/schema'
import type { ModuleContext } from './module/types'
import type { OperationResponseError } from './runtime/types'
import { SchemaProvider } from './module/SchemaProvider'
import { ConsolePrompt } from './module/ConsolePrompt'
export type { GraphqlMiddlewareServerOptions } from './types'

function useViteWebSocket(nuxt: Nuxt): Promise<WebSocketServer> {
  return new Promise((resolve) => {
    nuxt.hooks.hook('vite:serverCreated', (viteServer) => {
      resolve(viteServer.ws)
    })
  })
}

export interface ModuleOptions {
  /**
   * File glob patterns for the auto import feature.
   *
   * If left empty, no documents are auto imported.
   *
   * @default
   * ```json
   * ["**\/.{gql,graphql}", "!node_modules"]
   * ```
   *
   * @example
   * ```ts
   * // Load .graphql files from pages folder and from a node_modules dependency.
   * const autoImportPatterns = [
   *   './pages/**\/*.graphql',
   *   'node_modules/my_library/dist/**\/*.graphql'
   * ]
   * ```
   */
  autoImportPatterns?: string[]

  /**
   * Additional raw documents to include.
   *
   * Useful if for example you need to generate queries during build time.
   *
   * @default []
   *
   * @example
   * ```ts
   * const documents = [`
   *   query myQuery {
   *     articles {
   *       title
   *       id
   *     }
   *   }`,
   *   ...getGeneratedDocuments()
   * ]
   * ```
   */
  documents?: string[]

  /**
   * Wether the useGraphqlQuery, useGraphqlMutation and useGraphqlState
   * composables should be included.
   *
   * @default ```ts
   * true
   * ```
   */
  includeComposables?: boolean

  /**
   * Enable support for uploading files via GraphQL.
   *
   * When enabled, an additional `useGraphqlUploadMutation` composable is
   * included, in addition to a new server endpoint that handles multi part
   * file uploads for GraphQL mutations.
   */
  enableFileUploads?: boolean

  /**
   * Enable detailled debugging messages.
   *
   * @default false
   */
  debug?: boolean

  /**
   * Displays GraphQL response errors in an overlay in dev mode.
   */
  errorOverlay?: boolean

  /**
   * The URL of the GraphQL server.
   *
   * For the runtime execution you can provide a method that determines the endpoint
   * during runtime. See the server/graphqlMiddleware.serverOptions.ts documentation
   * for more information.
   */
  graphqlEndpoint: string

  /**
   * Download the GraphQL schema and store it on disk.
   *
   * @default true
   */
  downloadSchema?: boolean

  /**
   * The prefix for the server route.
   *
   * @default ```ts
   * "/api/graphql_middleware"
   * ```
   */
  serverApiPrefix?: string

  /**
   * Path to the GraphQL schema file.
   *
   * If `downloadSchema` is `true`, the downloaded schema is written to this specified path.
   * If `downloadSchema` is `false`, this file must be present in order to generate types.
   *
   * @default './schema.graphql'
   */
  schemaPath?: string

  /**
   * Logs only errors.
   *
   * When enabled only errors are logged to the console when generating the GraphQL operations.
   * If false, all operations are logged, including valid ones.
   */
  logOnlyErrors?: boolean

  /**
   * Options for graphql-typescript-deluxe code generator.
   */
  codegenConfig?: GeneratorOptions

  /**
   * Configuration for graphql-codegen when downloading the schema.
   */
  codegenSchemaConfig?: {
    /**
     * Configure how the schema.graphql file should be generated.
     */
    schemaAstConfig?: SchemaASTConfig

    /**
     * Configure how the schema-ast introspection request should be made.
     *
     * Usually this is where you can provide a custom authentication header:
     *
     * ```typescript
     * const codegenSchemaConfig = {
     *   urlSchemaOptions: {
     *     headers: {
     *       authentication: 'foobar',
     *     }
     *   }
     * }
     * ```
     */
    urlSchemaOptions?: Types.UrlSchemaOptions
  }

  /**
   * Set to true if you want to output each compiled query and mutation in the
   * .nuxt folder.
   * Set to a path to output to a custom path.
   */
  outputDocuments?: boolean | string

  /**
   * Enable Nuxt DevTools integration.
   */
  devtools?: boolean

  /**
   * Client caching configuration.
   */
  clientCache?: {
    enabled?: boolean
    maxSize?: number
  }
}

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
    const options = defu({}, passedOptions, defaultOptions) as ModuleOptions

    function addAlias(name: string, path: string) {
      nuxt.options.alias[name] = path

      // In our case, the name of the alias corresponds to a folder in the build
      // dir with the same name (minus the #).
      const pathFromName = `./${name.substring(1)}`

      // Currently needed due to a bug in Nuxt that does not add aliases for
      // nitro. As this has happened before in the past, let's leave it so that
      // we are guaranteed to have these aliases also for server types.
      nuxt.options.nitro.typescript ||= {}
      nuxt.options.nitro.typescript.tsConfig ||= {}
      nuxt.options.nitro.typescript.tsConfig.compilerOptions ||= {}
      nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths ||= {}
      nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths[name] = [
        pathFromName,
      ]
      nuxt.options.nitro.typescript.tsConfig.compilerOptions.paths[
        name + '/*'
      ] = [pathFromName + '/*']
    }

    /**
     * Not exactly sure what this is doing, but it's needed for certain templates
     * to work correctly.
     */
    function inlineNitroExternals(path: string) {
      nuxt.options.nitro.externals = nuxt.options.nitro.externals || {}
      nuxt.options.nitro.externals.inline =
        nuxt.options.nitro.externals.inline || []
      nuxt.options.nitro.externals.inline.push(path)
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

    const isModuleBuild =
      process.env.MODULE_BUILD === 'true' && nuxt.options._prepare

    // When running dev:prepare during module development we have to "fake"
    // options to use the playground.
    if (isModuleBuild) {
      options.graphqlEndpoint = 'http://localhost'
      options.downloadSchema = false
      options.schemaPath = '~~/schema.graphql'
      options.autoImportPatterns = [
        '~~/playground/**/*.{gql,graphql}',
        '!node_modules',
      ]
    }

    // Add sane default for the autoImportPatterns option.
    // We don't want to add them to the default options, because defu would
    // merge the array with the array provided by the user.
    if (!passedOptions.autoImportPatterns) {
      options.autoImportPatterns = ['~~/**/*.{gql,graphql}', '!node_modules']
    }

    options.autoImportPatterns = (options.autoImportPatterns || []).map(
      (pattern) => {
        // Resolves aliases such as `~` or `#custom`.
        return resolveAlias(pattern)
      },
    )

    // Will throw an error if the options are not valid.
    if (!nuxt.options._prepare) {
      validateOptions(options)
    }

    const moduleResolver = createResolver(import.meta.url)
    const serverResolver = createResolver(nuxt.options.serverDir)
    const srcResolver = createResolver(nuxt.options.srcDir)
    const appResolver = createResolver(nuxt.options.dir.app)
    const rootDir = nuxt.options.rootDir
    const rootResolver = createResolver(rootDir)

    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    nuxt.options.build.transpile.push(runtimeDir)

    const nuxtGraphqlMiddlewareBuildDir =
      nuxt.options.buildDir + '/nuxt-graphql-middleware'

    const operationTypesBuildDir = nuxt.options.buildDir + '/graphql-operations'
    const toBuildRelative = (path: string) => {
      return relative(nuxtGraphqlMiddlewareBuildDir, path)
    }

    addAlias('#nuxt-graphql-middleware', nuxtGraphqlMiddlewareBuildDir)
    addAlias('#graphql-operations', operationTypesBuildDir)

    const context: ModuleContext = {
      isDev: nuxt.options.dev,
      patterns: options.autoImportPatterns || [],
      srcDir: nuxt.options.srcDir,
      rootDir: nuxt.options.rootDir,
      buildDir: srcResolver.resolve(nuxt.options.buildDir),
      nuxtConfigPath: rootResolver.resolve('nuxt.config.ts'),
      serverApiPrefix: options.serverApiPrefix!,
      logOnlyErrors: !!options.logOnlyErrors,
      runtimeTypesPath: toBuildRelative(
        moduleResolver.resolve('./runtime/types.ts'),
      ),
    }

    const prompt = new ConsolePrompt()
    const schemaProvider = new SchemaProvider(
      context,
      options,
      rootResolver.resolve(resolveAlias(options.schemaPath!)),
    )

    /**
     * Loads the schema from disk.
     */
    async function loadFromDiskFallback(): Promise<boolean> {
      const hasSchemaOnDisk = await schemaProvider.hasSchemaOnDisk()
      if (context.isDev && hasSchemaOnDisk && options.downloadSchema) {
        const shouldUseFromDisk = await prompt.confirm(
          'Do you want to continue with the previously downloaded schema from disk?',
        )
        if (shouldUseFromDisk === 'yes') {
          await schemaProvider.loadSchema({ forceDisk: true })
          return true
        }
      }

      return false
    }

    /**
     * Initialise the collector.
     *
     * In dev mode, the method will call itself recursively until all documents
     * are valid.
     */
    async function initDocumentValidation() {
      try {
        await collector.init()
      } catch (e) {
        if (context.isDev) {
          const shouldRevalidate = await prompt.confirm(
            'Do you want to revalidate the GraphQL documents?',
          )

          if (shouldRevalidate === 'yes') {
            await collector.reset()
            return initDocumentValidation()
          }
        }
        throw new Error('Graphql document validation failed.')
      }
    }

    try {
      await schemaProvider.loadSchema()
    } catch (error) {
      logger.error(error)
      const hasLoaded = await loadFromDiskFallback()
      if (!hasLoaded) {
        throw new Error('Failed to load GraphQL schema.')
      }
    }

    const collector = new Collector(
      schemaProvider.getSchema(),
      context,
      options.documents,
      options.codegenConfig,
    )

    await initDocumentValidation()

    const isDevToolsEnabled = nuxt.options.dev && options.devtools

    let rpc: BirpcGroup<ClientFunctions, ServerFunctions> | undefined
    if (isDevToolsEnabled) {
      const clientPath = moduleResolver.resolve('./client')
      setupDevToolsUI(nuxt, clientPath)

      onDevToolsInitialized(() => {
        rpc = extendServerRpc<ClientFunctions, ServerFunctions>(RPC_NAMESPACE, {
          // register server RPC functions
          getModuleOptions() {
            return options
          },
          getDocuments() {
            return [...collector.rpcItems.values()]
          },
        })
      })
    }

    nuxt.options.appConfig.graphqlMiddleware = {
      clientCacheEnabled: !!options.clientCache?.enabled,
      clientCacheMaxSize: options.clientCache?.maxSize || 100,
    }

    nuxt.options.runtimeConfig.graphqlMiddleware = {
      graphqlEndpoint: options.graphqlEndpoint || '',
    }

    if (options.includeComposables) {
      const nuxtComposables = [
        'useGraphqlQuery',
        'useGraphqlMutation',
        'useGraphqlState',
        'useAsyncGraphqlQuery',
      ]

      if (options.enableFileUploads) {
        nuxtComposables.push('useGraphqlUploadMutation')
      }

      nuxtComposables.forEach((name) => {
        addImports({
          from: moduleResolver.resolve('./runtime/composables/' + name),
          name,
        })
      })

      const serverUtils = ['useGraphqlQuery', 'useGraphqlMutation'].map(
        (name) => {
          return {
            from: moduleResolver.resolve('./runtime/server/utils/' + name),
            name,
          }
        },
      )
      addServerImports(serverUtils)
    }

    addCollectorTypeTemplate(Template.OperationTypes)
    addCollectorTypeTemplate(Template.OperationTypesAll)
    addCollectorTypeTemplate(Template.Types)
    addCollectorTypeTemplate(Template.HelpersTypes)
    addCollectorTypeTemplate(Template.NitroTypes)
    addCollectorTypeTemplate(Template.ResponseTypes)
    addCollectorTypeTemplate(Template.DocumentTypes)

    addCollectorTemplate(Template.Enums)
    addCollectorTemplate(Template.OperationSources)
    addCollectorTemplate(Template.Helpers)

    addVirtualCollectorTemplate(Template.Documents)

    const findServerOptions = () => {
      // Look for the file in the server directory.
      const newPath = serverResolver.resolve('graphqlMiddleware.serverOptions')
      const serverPath = fileExists(newPath)

      if (serverPath) {
        return serverPath
      }

      // Possible locations for backwards compatibility.
      const candidates: string[] = [
        rootResolver.resolve('graphqlMiddleware.serverOptions'),
        rootResolver.resolve('app/graphqlMiddleware.serverOptions'),
        srcResolver.resolve('graphqlMiddleware.serverOptions'),
      ]

      for (let i = 0; i < candidates.length; i++) {
        const path = candidates[i]
        const filePath = fileExists(path)

        if (filePath) {
          logger.warn(
            `The graphqlMiddleware.serverOptions file should be placed in Nuxt's <serverDir> ("${nuxt.options.serverDir}/graphqlMiddleware.serverOptions.ts"). The new path will be enforced in the next major release.`,
          )
          return filePath
        }
      }

      logger.info('No graphqlMiddleware.serverOptions file found.')
    }

    const resolvedServerOptionsPath = findServerOptions()

    const moduleTypesPath = toBuildRelative(moduleResolver.resolve('./types'))

    const resolvedPathRelative = resolvedServerOptionsPath
      ? toBuildRelative(resolvedServerOptionsPath)
      : null

    const template = addTemplate({
      filename: 'nuxt-graphql-middleware/server-options.mjs',
      write: true,
      getContents: () => {
        const serverOptionsLine = resolvedPathRelative
          ? `import serverOptions from '${resolvedPathRelative}'`
          : `const serverOptions = {}`
        return `
${serverOptionsLine}
export { serverOptions }
`
      },
    })
    inlineNitroExternals(template.dst)

    addTemplate({
      filename: 'nuxt-graphql-middleware/server-options.d.ts',
      write: true,
      getContents: () => {
        const serverOptionsLineTypes = resolvedPathRelative
          ? `import serverOptions from '${resolvedPathRelative}'`
          : `const serverOptions: GraphqlMiddlewareServerOptions = {}`

        return `
import type { GraphqlMiddlewareServerOptions } from '${moduleTypesPath}'
${serverOptionsLineTypes}

export type GraphqlResponseAdditions =
  typeof serverOptions extends GraphqlMiddlewareServerOptions<infer R, any, any> ? R : {}

export { serverOptions }`
      },
    })

    const getClientOptionsImport = () => {
      const clientOptionsPath = appResolver.resolve(
        'graphqlMiddleware.clientOptions',
      )

      if (fileExists(clientOptionsPath)) {
        const pathRelative = toBuildRelative(clientOptionsPath)
        return `import clientOptions from '${pathRelative}'`
      }
    }

    const clientOptionsImport = getClientOptionsImport()

    addTemplate({
      filename: 'nuxt-graphql-middleware/client-options.mjs',
      write: true,
      getContents: () => {
        // clientOptions file exists.
        if (clientOptionsImport) {
          return `${clientOptionsImport}
export { clientOptions }`
        }

        return `export const clientOptions = {}`
      },
    })

    addTemplate({
      filename: 'nuxt-graphql-middleware/client-options.d.ts',
      write: true,
      getContents: () => {
        if (clientOptionsImport) {
          return `import type { GraphqlClientOptions } from '${context.runtimeTypesPath}'
${clientOptionsImport}

export type GraphqlClientContext = typeof clientOptions extends GraphqlClientOptions<infer R> ? R : {}

export { clientOptions }`
        }

        return `import type { GraphqlClientOptions } from '${context.runtimeTypesPath}'
export const clientOptions: GraphqlClientOptions

export type GraphqlClientContext = {}
`
      },
    })

    // Add the server API handler.
    addServerHandler({
      handler: moduleResolver.resolve('./runtime/serverHandler/index'),
      route: options.serverApiPrefix + '/:operation/:name',
    })

    if (options.enableFileUploads) {
      addServerHandler({
        handler: moduleResolver.resolve('./runtime/serverHandler/upload'),
        route: options.serverApiPrefix + '/upload/:name',
      })
    }

    addPlugin(moduleResolver.resolve('./runtime/plugins/provideState'), {
      append: false,
    })

    if (context.isDev && options.errorOverlay) {
      addPlugin(moduleResolver.resolve('./runtime/plugins/devMode'), {
        append: false,
      })
    }

    // @TODO: Why is this needed?!
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.externals = defu(
        typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {},
        {
          inline: [moduleResolver.resolve('./runtime')],
        },
      )
    })

    // Watch for file changes in dev mode.
    if (nuxt.options.dev || nuxt.options._prepare) {
      addServerHandler({
        handler: moduleResolver.resolve('./runtime/serverHandler/debug'),
        route: options.serverApiPrefix + '/debug',
      })

      const wsPromise = useViteWebSocket(nuxt)

      function sendError(error: { message: string }) {
        wsPromise.then((ws) => {
          ws.send({
            type: 'error',
            err: {
              message: error.message,
              stack: '',
            },
          })
        })
      }

      let nitro: Nitro | null = null
      // Names of operations for which we need to trigger a HMR event.
      const operationsToReload: Set<string> = new Set()

      nuxt.hooks.hook('ready', () => {
        nitro = useNitro()

        // Event emitted when the Nitro server has finished compiling.
        nitro.hooks.hook('compiled', () => {
          if (!operationsToReload.size) {
            return
          }

          // Get all operations that need to be reloaded.
          const operations = [...operationsToReload.values()]
          operationsToReload.clear()

          // Send the HMR event to trigger refreshing in useAsyncGraphqlQuery.
          wsPromise.then((ws) => {
            ws.send({
              type: 'custom',
              event: 'nuxt-graphql-middleware:reload',
              data: { operations },
            })
          })
        })
      })

      nuxt.hook('builder:watch', async (event, pathAbsolute) => {
        if (pathAbsolute === schemaProvider.schemaPath) {
          return
        }

        // We only care about GraphQL files.
        if (!pathAbsolute.match(/\.(gql|graphql)$/)) {
          return
        }

        prompt.abort()

        const { hasChanged, affectedOperations, error } =
          await collector.handleWatchEvent(event, pathAbsolute)

        if (error) {
          sendError(error)
          await prompt
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

        if (rpc) {
          try {
            rpc.broadcast.documentsUpdated([...collector.rpcItems.values()])
          } catch {
            // Noop.
          }
        }
      })
    }
  },
})

declare module '@nuxt/schema' {
  interface AppConfig {
    graphqlMiddleware: {
      clientCacheEnabled: boolean
      clientCacheMaxSize: number
    }
  }
}

declare module '#app' {
  interface RuntimeNuxtHooks {
    'nuxt-graphql-middleware:errors': (
      errors: OperationResponseError,
    ) => HookResult
  }
}

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    'nuxt-graphql-middleware:reload': { operations: string[] }
  }
}
