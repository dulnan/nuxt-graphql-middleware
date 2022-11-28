import type { NuxtModule } from '@nuxt/schema'
import { defu } from 'defu'
import {
  defineNuxtModule,
  addServerHandler,
  createResolver,
  addTemplate,
  addImportsDir,
} from '@nuxt/kit'
import inquirer from 'inquirer'
import { GraphqlMiddlewareConfig, GraphqlMiddlewareTemplate } from './types'
import {
  validateOptions,
  getSchemaPath,
  generate,
  defaultOptions,
  logger,
} from './helpers'
import { CodegenResult } from './codegen'

// Nuxt needs this.
export type ModuleOptions = GraphqlMiddlewareConfig
export type ModuleHooks = {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-graphql-middleware',
    configKey: 'graphqlMiddleware',
  },
  defaults: defaultOptions,
  async setup(passedOptions, nuxt) {
    const options = defu({}, passedOptions, defaultOptions) as ModuleOptions

    // Will throw an error if the options are not valid.
    validateOptions(options)

    const rootDir = nuxt.options.rootDir
    const moduleResolver = createResolver(import.meta.url).resolve
    const srcDir = nuxt.options.srcDir
    const srcResolver = createResolver(srcDir).resolve
    const schemaPath = await getSchemaPath(options, srcResolver)

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
        const templates = await generate(
          options,
          schemaPath,
          srcResolver,
          srcDir,
        )
        ctx.templates = templates
      } catch (e) {
        logger.error('Failed to generate GraphQL files.')
        if (isFirst) {
          process.exit(1)
        }
        if (!options.downloadSchema) {
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
              await getSchemaPath(options, srcResolver)
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
      rootDir,
    }

    // Watch for file changes.
    nuxt.hook('builder:watch', async (event, path) => {
      // We only care about GraphQL files.
      if (!path.match(/\.(gql|graphql)$/)) {
        return
      }
      if (schemaPath.includes(path)) {
        return
      }

      await generateHandler()
      await nuxt.callHook('builder:generateApp')
      logger.error('GENEARETD')
    })

    // Add composables.
    addImportsDir(moduleResolver('runtime/composables'))

    // Add the templates to nuxt and provide a callback to load the file contents.
    Object.values(GraphqlMiddlewareTemplate).forEach((filename) => {
      const result = addTemplate({
        write: true,
        filename,
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

    nuxt.options.alias['#graphql-composable'] = moduleResolver(
      'runtime/composables',
    )

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
  export default documents
}
`
      },
    })

    // Add the server API handler.
    addServerHandler({
      handler: moduleResolver('./runtime/serverHandler/index'),
      route: options.serverApiPrefix + '/:operation/:name',
    })
  },
}) as NuxtModule<ModuleOptions>
