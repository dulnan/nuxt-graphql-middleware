import { fileURLToPath } from 'url'
import type { Types } from '@graphql-codegen/plugin-helpers'
import { type SchemaASTConfig } from '@graphql-codegen/schema-ast'
import { relative, resolve } from 'pathe'
import { defu } from 'defu'
import { type BirpcGroup } from 'birpc'
import {
  defineNuxtModule,
  addServerHandler,
  createResolver,
  addTemplate,
  updateTemplates,
  addPlugin,
  addImports,
  resolveAlias,
  addServerImports,
} from '@nuxt/kit'
import inquirer from 'inquirer'
import { type TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import { extendServerRpc, onDevToolsInitialized } from '@nuxt/devtools-kit'
import { name, version } from '../package.json'
import { setupDevToolsUI } from './devtools'
import { GraphqlMiddlewareTemplate } from './runtime/settings'
import {
  validateOptions,
  getSchemaPath,
  generate,
  defaultOptions,
  logger,
  fileExists,
  outputDocuments,
} from './helpers'
import { type CodegenResult } from './codegen'
import { type ClientFunctions, type ServerFunctions } from './rpc-types'
import { type GraphqlMiddlewareDocument } from './types'
export type { GraphqlMiddlewareServerOptions } from './types'

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
   * Automatically inline fragments.
   *
   * By default, fragments have to imported using the non-standard "#import"
   * syntax.
   *
   * When enabling this feature, the module will automatically inline fragments by name.
   */
  autoInlineFragments?: boolean

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
   * These options are passed to the graphql-codegen method when generating the
   * TypeScript operations types.
   *
   * {@link https://www.the-guild.dev/graphql/codegen/plugins/typescript/typescript-operations}
   * @default
   * ```ts
   * const codegenConfig = {
   *   exportFragmentSpreadSubTypes: true,
   *   preResolveTypes: true,
   *   skipTypeNameForRoot: true,
   *   skipTypename: true,
   *   useTypeImports: true,
   *   onlyOperationTypes: true,
   *   namingConvention: {
   *     enumValues: 'change-case-all#upperCaseFirst',
   *   },
   * }
   * ```
   */
  codegenConfig?: TypeScriptDocumentsPluginConfig

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
      nuxt: '>=3.13.0',
    },
  },
  defaults: defaultOptions,
  async setup(passedOptions, nuxt) {
    const options = defu({}, passedOptions, defaultOptions) as ModuleOptions

    const isModuleBuild =
      process.env.MODULE_BUILD === 'true' && nuxt.options._prepare

    // When running dev:prepare during module development we have to "fake"
    // options to use the playground.
    if (isModuleBuild) {
      options.graphqlEndpoint = 'http://localhost'
      options.downloadSchema = false
      options.schemaPath = '~~/schema.graphql'
      options.autoInlineFragments = true
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

    const schemaPathReplaced = resolveAlias(options.schemaPath!)

    const moduleResolver = createResolver(import.meta.url)
    const serverResolver = createResolver(nuxt.options.serverDir)
    const srcResolver = createResolver(nuxt.options.srcDir)
    const appResolver = createResolver(nuxt.options.dir.app)
    const rootDir = nuxt.options.rootDir
    const rootResolver = createResolver(rootDir)
    const schemaPath = await getSchemaPath(
      schemaPathReplaced,
      options,
      rootResolver.resolve,
      options.downloadSchema,
    )

    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    nuxt.options.build.transpile.push(runtimeDir)

    // Store the generated templates in a locally scoped object.
    const ctx = {
      templates: [] as CodegenResult[],
      documents: [] as GraphqlMiddlewareDocument[],
    }

    let rpc: BirpcGroup<ClientFunctions, ServerFunctions> | null = null
    if (options.devtools) {
      const clientPath = moduleResolver.resolve('./client')
      setupDevToolsUI(nuxt, clientPath)
      // Hack needed because in a playground environment the call
      // onDevToolsInitialized is needed, but when the module is actually
      // installed in a Nuxt app, this callback is never called and thus
      // the RPC never extended.
      const setupRpc = () => {
        rpc = extendServerRpc<ClientFunctions, ServerFunctions>(RPC_NAMESPACE, {
          // register server RPC functions
          getModuleOptions() {
            return options
          },
          getDocuments() {
            return ctx.documents
          },
        })
      }

      try {
        setupRpc()
      } catch (_e) {
        onDevToolsInitialized(() => {
          setupRpc()
        })
      }
    }

    let prompt:
      | (Promise<{ accept: any }> & {
          ui: inquirer.ui.Prompt<{ accept: any }>
        })
      | null = null
    const generateHandler = async (isFirst = false) => {
      if (prompt && prompt.ui) {
        // @ts-ignore
        prompt.ui.close()
        prompt = null
      }

      try {
        const { templates, hasErrors, documents } = await generate(
          options,
          schemaPath,
          rootResolver.resolve,
          rootDir,
          isFirst,
        )
        ctx.templates = templates
        ctx.documents = documents
        rpc?.broadcast.documentsUpdated(documents)

        // Output the generated documents if desired.
        if (options.outputDocuments) {
          let destFolder
          if (typeof options.outputDocuments === 'boolean') {
            destFolder = resolve(
              nuxt.options.buildDir,
              'nuxt-graphql-middleware/documents',
            )
          } else {
            destFolder = options.outputDocuments
          }

          outputDocuments(destFolder, documents)
          if (isFirst) {
            logger.info('Documents generated at ' + destFolder)
          }
        }
        if (hasErrors) {
          throw new Error('Documents has errors.')
        }
      } catch (e) {
        console.log(e)
        logger.error('Failed to generate GraphQL files.')
        if (isFirst) {
          // Exit process if there are errors in the first run.
          process.exit(1)
        }
        if (!options.downloadSchema) {
          return
        }
        if (!nuxt.options.dev) {
          return
        }
        process.stdout.write('\n')
        logger.restoreStd()
        prompt = inquirer.prompt({
          type: 'confirm',
          name: 'accept',
          message: 'Do you want to reload the GraphQL schema?',
        })

        prompt.then(async ({ accept }) => {
          if (accept) {
            await getSchemaPath(
              schemaPathReplaced,
              options,
              rootResolver.resolve,
              true,
            )
            await generateHandler()
          }
        })
      }
    }

    await generateHandler(true)

    nuxt.options.runtimeConfig.public['nuxt-graphql-middleware'] = {
      serverApiPrefix: options.serverApiPrefix!,
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

    // Add the templates to nuxt and provide a callback to load the file contents.
    Object.values(GraphqlMiddlewareTemplate).forEach((filename) => {
      const result = addTemplate({
        write: true,
        filename,
        options: {
          nuxtGraphqlMiddleware: true,
        },
        getContents: () => {
          // This will load the contents of the files dynamically. The watcher
          // hook updates these files if needed.
          return (
            ctx.templates.find((v) => v.filename === filename)?.content || ''
          )
        },
      })

      if (result.dst.includes(GraphqlMiddlewareTemplate.Documents)) {
        nuxt.options.alias['#graphql-documents'] = result.dst
      } else if (
        result.dst.includes(GraphqlMiddlewareTemplate.OperationTypes)
      ) {
        nuxt.options.alias['#graphql-operations'] = result.dst
      } else if (
        result.dst.includes(GraphqlMiddlewareTemplate.ComposableContext)
      ) {
        nuxt.options.alias['#nuxt-graphql-middleware/generated-types'] =
          result.dst
      }
    })

    addTemplate({
      write: true,
      filename: 'graphql-documents.d.ts',
      getContents: () => {
        return `
import type {
  GraphqlMiddlewareQuery,
  GraphqlMiddlewareMutation,
} from '#nuxt-graphql-middleware/generated-types'

declare module '#graphql-documents' {
  type Documents = {
    query: GraphqlMiddlewareQuery
    mutation: GraphqlMiddlewareMutation
  }
  const documents: Documents
  export { documents, Documents }
}
`
      },
    })

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

    const resolvedPath = findServerOptions()

    const moduleTypesPath = relative(
      nuxt.options.buildDir,
      moduleResolver.resolve('./types'),
    )

    const resolvedPathRelative = resolvedPath
      ? relative(nuxt.options.buildDir, resolvedPath)
      : null

    const template = addTemplate({
      filename: 'graphqlMiddleware.serverOptions.mjs',
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

    addTemplate({
      filename: 'graphqlMiddleware.serverOptions.d.ts',
      write: true,
      getContents: () => {
        const serverOptionsLineTypes = resolvedPathRelative
          ? `import serverOptions from '${resolvedPathRelative}'`
          : `const serverOptions: GraphqlMiddlewareServerOptions = {}`

        return `
import type { GraphqlMiddlewareServerOptions } from '${moduleTypesPath}'
${serverOptionsLineTypes}
import type { GraphqlServerResponse } from '#graphql-middleware/types'
import type { GraphqlMiddlewareResponseUnion } from '#nuxt-graphql-middleware/generated-types'

type GraphqlResponseAdditions =
  typeof serverOptions extends GraphqlMiddlewareServerOptions<infer R, any, any> ? R : {}

export type GraphqlResponse<T> = GraphqlServerResponse<T> & GraphqlResponseAdditions

export type GraphqlResponseTyped = GraphqlResponse<GraphqlMiddlewareResponseUnion>

export { serverOptions }
`
      },
    })

    const getClientOptionsImport = () => {
      const clientOptionsPath = appResolver.resolve(
        'graphqlMiddleware.clientOptions',
      )

      if (fileExists(clientOptionsPath)) {
        const pathRelative = relative(nuxt.options.buildDir, clientOptionsPath)
        return `import clientOptions from '${pathRelative}'`
      }
    }

    const clientOptionsImport = getClientOptionsImport()

    const clientOptionsTemplate = addTemplate({
      filename: 'graphqlMiddleware.clientOptions.mjs',
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
      filename: 'graphqlMiddleware.clientOptions.d.ts',
      write: true,
      getContents: () => {
        if (clientOptionsImport) {
          return `import { GraphqlClientOptions } from '#graphql-middleware/types'
${clientOptionsImport}

export type GraphqlClientContext = typeof clientOptions extends GraphqlClientOptions<infer R> ? R : {}

export { clientOptions }`
        }

        return `import { GraphqlClientOptions } from '#graphql-middleware/types'
export const clientOptions: GraphqlClientOptions

export type GraphqlClientContext = {}
`
      },
    })

    nuxt.options.alias['#graphql-middleware-client-options'] =
      clientOptionsTemplate.dst

    nuxt.options.nitro.externals = nuxt.options.nitro.externals || {}
    nuxt.options.nitro.externals.inline =
      nuxt.options.nitro.externals.inline || []
    nuxt.options.nitro.externals.inline.push(template.dst)
    nuxt.options.alias['#graphql-middleware-server-options-build'] =
      template.dst

    nuxt.options.alias['#graphql-middleware/types'] =
      moduleResolver.resolve('./runtime/types')

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
      nuxt.hook('nitro:build:before', (nitro) => {
        nuxt.hook('builder:watch', async (_event, path) => {
          path = relative(
            nuxt.options.srcDir,
            resolve(nuxt.options.srcDir, path),
          )
          // We only care about GraphQL files.
          if (!path.match(/\.(gql|graphql)$/)) {
            return
          }
          if (schemaPath.includes(path)) {
            return
          }

          await generateHandler()
          await updateTemplates({
            filter: (template) => {
              return template.options && template.options.nuxtGraphqlMiddleware
            },
          })

          // Workaround until https://github.com/nuxt/framework/issues/8720 is
          // implemented.
          await nitro.hooks.callHook('dev:reload')
        })
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
