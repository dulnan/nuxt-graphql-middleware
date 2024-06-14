import { fileURLToPath } from 'url'
import type { Types } from '@graphql-codegen/plugin-helpers'
import { type SchemaASTConfig } from '@graphql-codegen/schema-ast'
import { resolve } from 'pathe'
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
   * Enable detailled debugging messages.
   *
   * @default false
   */
  debug?: boolean

  /**
   * The URL of the GraphQL server.
   *
   * For the runtime execution you can provide a method that determines the endpoint
   * during runtime. See the app/graphqlMiddleware.serverOptions.ts documentation
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
   */
  outputDocuments?: boolean

  /**
   * Enable Nuxt DevTools integration.
   */
  devtools?: boolean
}

// Nuxt needs this.
export type ModuleHooks = {}

const RPC_NAMESPACE = 'nuxt-graphql-middleware'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey: 'graphqlMiddleware',
    version,
    compatibility: {
      nuxt: '>=3.1.0',
    },
  },
  defaults: defaultOptions,
  async setup(passedOptions, nuxt) {
    const options = defu({}, passedOptions, defaultOptions) as ModuleOptions

    // Add sane default for the autoImportPatterns option.
    if (!passedOptions.autoImportPatterns) {
      options.autoImportPatterns = ['**/*.{gql,graphql}', '!node_modules']
    }

    // Will throw an error if the options are not valid.
    validateOptions(options)

    const moduleResolver = createResolver(import.meta.url).resolve
    const srcDir = nuxt.options.srcDir
    const srcResolver = createResolver(srcDir).resolve
    const schemaPath = await getSchemaPath(
      options,
      srcResolver,
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
      const clientPath = moduleResolver('./client')
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
          srcResolver,
          srcDir,
          isFirst,
        )
        ctx.templates = templates
        ctx.documents = documents
        rpc?.broadcast.documentsUpdated(documents)

        // Output the generated documents if desired.
        if (options.outputDocuments) {
          const destFolder = resolve(
            nuxt.options.buildDir,
            'nuxt-graphql-middleware/documents',
          )

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
            await getSchemaPath(options, srcResolver, true)
            await generateHandler()
          }
        })
      }
    }

    await generateHandler(true)

    nuxt.options.runtimeConfig.public['nuxt-graphql-middleware'] = {
      serverApiPrefix: options.serverApiPrefix!,
    }

    nuxt.options.runtimeConfig.graphqlMiddleware = {
      graphqlEndpoint: options.graphqlEndpoint || '',
    }

    if (options.includeComposables) {
      addImports({
        from: moduleResolver('./runtime/composables/useGraphqlQuery'),
        name: 'useGraphqlQuery',
      })
      addImports({
        from: moduleResolver('./runtime/composables/useGraphqlMutation'),
        name: 'useGraphqlMutation',
      })
      addImports({
        from: moduleResolver('./runtime/composables/useGraphqlState'),
        name: 'useGraphqlState',
      })
      nuxt.options.alias['#graphql-composable'] = moduleResolver(
        'runtime/composables/server',
      )
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
      }
    })

    addTemplate({
      write: true,
      filename: 'graphql-documents.d.ts',
      getContents: () => {
        return `
import {
  GraphqlMiddlerwareQuery,
  GraphqlMiddlewareMutation,
} from '#build/nuxt-graphql-middleware'

declare module '#graphql-documents' {
  type Documents = {
    query: GraphqlMiddlerwareQuery
    mutation: GraphqlMiddlerwareMutation
  }
  const documents: Documents
  export { documents }
}
`
      },
    })

    // Shamelessly copied and adapted from:
    // https://github.com/nuxt-modules/prismic/blob/fd90dc9acaa474f79b8831db5b8f46a9a9f039ca/src/module.ts#L55
    //
    // Creates the template with runtime server configuration used by the
    // GraphQL server handler.
    const extensions = ['js', 'mjs', 'ts']
    const resolvedPath = '~/app/graphqlMiddleware.serverOptions'
      .replace(/^(~~|@@)/, nuxt.options.rootDir)
      .replace(/^(~|@)/, nuxt.options.srcDir)
    // nuxt.options.build.transpile.push(resolvedPath)
    const template = (() => {
      const resolvedFilename = `graphqlMiddleware.serverOptions.ts`

      const maybeUserFile = fileExists(resolvedPath, extensions)

      if (maybeUserFile) {
        return addTemplate({
          filename: resolvedFilename,
          write: true,
          getContents: () => `export { default } from '${resolvedPath}'`,
        })
      }

      // Else provide `undefined` fallback
      return addTemplate({
        filename: resolvedFilename,
        write: true,
        getContents: () => 'export default {}',
      })
    })()

    nuxt.options.nitro.externals = nuxt.options.nitro.externals || {}
    nuxt.options.nitro.externals.inline =
      nuxt.options.nitro.externals.inline || []
    nuxt.options.nitro.externals.inline.push(template.dst)
    nuxt.options.alias['#graphql-middleware-server-options-build'] =
      template.dst

    // Add the server API handler.
    addServerHandler({
      handler: moduleResolver('./runtime/serverHandler/index'),
      route: options.serverApiPrefix + '/:operation/:name',
    })

    addPlugin(moduleResolver('./runtime/plugins/provideState'), {
      append: false,
    })

    // @TODO: Why is this needed?!
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.externals = defu(
        typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {},
        {
          inline: [moduleResolver('./runtime')],
        },
      )
    })

    // Watch for file changes in dev mode.
    if (nuxt.options.dev) {
      addServerHandler({
        handler: moduleResolver('./runtime/serverHandler/debug'),
        route: options.serverApiPrefix + '/debug',
      })
      nuxt.hook('nitro:build:before', (nitro) => {
        nuxt.hook('builder:watch', async (_event, path) => {
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
