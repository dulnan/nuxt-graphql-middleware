import { fileURLToPath } from 'url'
import type { NuxtModule } from '@nuxt/schema'
import { defu } from 'defu'
import {
  defineNuxtModule,
  addServerHandler,
  createResolver,
  addTemplate,
  addImportsDir,
  updateTemplates,
} from '@nuxt/kit'
import inquirer from 'inquirer'
import { name, version } from '../package.json'
import {
  GraphqlMiddlewareConfig,
  GraphqlMiddlewareServerOptions,
} from './types'
import { GraphqlMiddlewareTemplate } from './runtime/settings'
import {
  validateOptions,
  getSchemaPath,
  generate,
  defaultOptions,
  logger,
  fileExists,
} from './helpers'
import { CodegenResult } from './codegen'
export type { GraphqlMiddlewareServerOptions } from './types'

// Nuxt needs this.
export type ModuleOptions = GraphqlMiddlewareConfig
export type ModuleHooks = {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    configKey: 'graphqlMiddleware',
    version,
    compatibility: {
      nuxt: '^3.0.0',
    },
  },
  defaults: defaultOptions,
  async setup(passedOptions, nuxt) {
    const options = defu({}, passedOptions, defaultOptions) as ModuleOptions

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
    }

    let prompt: any = null
    const generateHandler = async (isFirst = false) => {
      if (prompt && prompt.ui) {
        prompt.ui.close()
        prompt = null
      }

      try {
        const { templates, hasErrors } = await generate(
          options,
          schemaPath,
          srcResolver,
          srcDir,
          isFirst,
        )
        ctx.templates = templates
        if (hasErrors) {
          throw new Error('Documents has errors.')
        }
      } catch (e) {
        console.log(e)
        logger.error('Failed to generate GraphQL files.')
        if (isFirst) {
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
        prompt = inquirer
          .prompt({
            type: 'confirm',
            name: 'accept',
            message: 'Do you want to reload the GraphQL schema?',
          })
          .then(async ({ accept }) => {
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
      // Add composables.
      addImportsDir(moduleResolver('runtime/composables'))
      nuxt.options.alias['#graphql-composable'] = moduleResolver(
        'runtime/composables',
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
    nuxt.options.alias['#graphql-middleware-server-options'] = template.dst

    // Add the server API handler.
    addServerHandler({
      handler: moduleResolver('./runtime/serverHandler/index'),
      route: options.serverApiPrefix + '/:operation/:name',
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
      nuxt.hook('nitro:build:before', (nitro) => {
        nuxt.hook('builder:watch', async (event, path) => {
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
}) as NuxtModule<ModuleOptions>

export function defineGraphqlServerOptions(
  options: GraphqlMiddlewareServerOptions,
) {
  return options
}
