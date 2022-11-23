import { fileURLToPath } from 'url'
import { promises as fsp } from 'fs'
import type { NuxtModule } from '@nuxt/schema'
import { defu } from 'defu'
import {
  defineNuxtModule,
  addPlugin,
  addServerHandler,
  createResolver,
  addTemplate,
  resolveFiles,
  resolveAlias,
  useLogger,
  addImportsDir,
} from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import { generateSchema, generateTemplates } from './codegen'
import { GraphqlMiddlewareConfig, GraphqlMiddlewareTemplate } from './types'
const fragmentImport = require('@graphql-fragment-import/lib/inline-imports')

const logger = useLogger('nuxt-graphql-middleware')

export type ModuleOptions = GraphqlMiddlewareConfig
export type ModuleHooks = {}

/**
 * Import and inline fragments in GraphQL documents.
 */
function inlineFragments(source: string, resolver: any) {
  return fragmentImport(source, {
    resolveImport(identifier: string) {
      return resolver(identifier)
    },
    resolveOptions: {
      basedir: './',
    },
  })
}

/**
 * Validate the module options.
 */
function validateOptions(options: Partial<ModuleOptions>) {
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint.')
  }
}

/**
 * Get the path to the GraphQL schema.
 */
async function getSchemaPath(
  options: ModuleOptions,
  resolver: Resolver['resolve'],
): Promise<string> {
  const dest = resolver(options.schemaPath!)
  if (!options.downloadSchema) {
    const fileExists = await fsp
      .access(dest)
      .then(() => true)
      .catch(() => false)
    if (!fileExists) {
      logger.error(
        '"downloadSchema" is set to false but no schema exists at ' + dest,
      )
      throw new Error('Missing GraphQL schema.')
    }
    return dest
  }
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint config.')
  }
  const graphqlEndpoint =
    typeof options.graphqlEndpoint === 'string'
      ? options.graphqlEndpoint
      : options.graphqlEndpoint()
  await generateSchema(graphqlEndpoint, dest)
  return dest
}

/**
 * Read the GraphQL files for the given patterns.
 */
async function autoImportDocuments(
  patterns: string[] = [],
  srcResolver: Resolver['resolve'],
): Promise<string[]> {
  if (!patterns.length) {
    return Promise.resolve([])
  }
  const files = (
    await resolveFiles(srcResolver(), patterns, {
      followSymbolicLinks: false,
    })
  ).filter((path) => {
    return !path.includes('schema.gql') && !path.includes('schema.graphql')
  })

  return Promise.all(
    files.map((v) => {
      return fsp.readFile(v).then((v) => v.toString())
    }),
  )
}

/**
 * Generates the TypeScript definitions and documents files.
 */
async function generate(
  options: ModuleOptions,
  schemaPath: string,
  resolver: Resolver['resolve'],
) {
  logger.info('Generating GraphQL files...')

  const documents: string[] = [
    ...(await autoImportDocuments(options.autoImportPatterns, resolver)),
    ...(options.documents || []),
  ].map((v) => inlineFragments(v, resolveAlias))

  const templates = await generateTemplates(documents, schemaPath, options)
  logger.success('Generated GraphQL files.')
  return templates
}

const defaultOptions: ModuleOptions = {
  codegenConfig: {
    exportFragmentSpreadSubTypes: true,
    preResolveTypes: true,
    skipTypeNameForRoot: true,
    skipTypename: true,
    useTypeImports: true,
    onlyOperationTypes: true,
    namingConvention: {
      enumValues: 'change-case-all#upperCaseFirst',
    },
  },
  downloadSchema: true,
  schemaPath: './schema.graphql',
  serverApiPrefix: '/api/graphql_middleware',
  graphqlEndpoint: '',
  debug: false,
  documents: [],
  autoImportPatterns: ['**/*.{gql,graphql}', '!node_modules'],
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-graphql-middleware',
    configKey: 'graphqlMiddleware',
  },
  defaults: defaultOptions,
  async setup(passedOptions, nuxt) {
    const options = defu({}, passedOptions, defaultOptions) as ModuleOptions
    validateOptions(options)

    const rootDir = nuxt.options.rootDir
    const moduleResolver = createResolver(import.meta.url).resolve
    const srcResolver = createResolver(nuxt.options.srcDir).resolve
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    const schemaPath = await getSchemaPath(options, srcResolver)
    const ctx = {
      templates: await generate(options, schemaPath, srcResolver),
    }
    nuxt.options.runtimeConfig.public['nuxt-graphql-middleware'] = {
      serverApiPrefix: options.serverApiPrefix!,
    }
    nuxt.options.runtimeConfig.graphqlMiddleware = {
      rootDir,
    }

    // Watch for file changes.
    nuxt.hook('builder:watch', async (_event, path) => {
      if (!path.match(/\.(gql|graphql)$/)) {
        return
      }

      ctx.templates = await generate(options, schemaPath, srcResolver)
      await nuxt.callHook('builder:generateApp')
    })

    addImportsDir(moduleResolver('runtime/composables'))

    // Add the templates to nuxt and provide a callback to load the file contents.
    Object.values(GraphqlMiddlewareTemplate).forEach((filename) => {
      const result = addTemplate({
        write: true,
        filename,
        getContents: () => {
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
  export { documents }
}
`
      },
    })

    // Add the state plugin.
    addPlugin(moduleResolver(runtimeDir, 'plugin'), {})

    // Add the server API handler.
    addServerHandler({
      handler: moduleResolver('./runtime/serverHandler/index'),
      route: options.serverApiPrefix + '/:operation/:name',
    })
  },
}) as NuxtModule<ModuleOptions>
