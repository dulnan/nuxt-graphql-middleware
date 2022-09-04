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
} from '@nuxt/kit'
import { generateTemplates } from './codegen'
import type { CodegenResult } from './codegen'
import { GraphqlMiddlewareConfig } from './types'
const fragmentImport = require('@graphql-fragment-import/lib/inline-imports')

const logger = useLogger('nuxt-graphql-middleware')

export type ModuleOptions = GraphqlMiddlewareConfig
export type ModuleHooks = {}

interface GraphqlMiddlewareContext {
  templates: CodegenResult[]
}

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

function validateOptions(options: Partial<ModuleOptions>) {
  if (!options.graphqlEndpoint) {
    throw new Error('Missing graphqlEndpoint.')
  }
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
  downloadSchema: false,
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

    nuxt.options.runtimeConfig = {
      public: {
        'nuxt-graphql-middleware': {
          serverApiPrefix: options.serverApiPrefix,
        },
      },
      graphqlMiddleware: {
        rootDir,
      },
    }
    const moduleResolver = createResolver(import.meta.url).resolve
    const srcResolver = createResolver(nuxt.options.srcDir).resolve

    function filterDocumentPath(path: string): boolean {
      return !path.includes('schema.')
    }

    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    nuxt.options.build.transpile.push(runtimeDir)

    nuxt.hook('autoImports:dirs', (dirs) => {
      dirs.push(moduleResolver('runtime/composables'))
    })

    const ctx: GraphqlMiddlewareContext = {
      templates: [],
    }

    async function autoImportDocuments(): Promise<string[]> {
      if (!options.autoImportPatterns.length) {
        return Promise.resolve([])
      }
      const files = (
        await resolveFiles(srcResolver(), options.autoImportPatterns, {
          followSymbolicLinks: false,
        })
      ).filter(filterDocumentPath)

      return Promise.all(
        files.map((v) => {
          return fsp.readFile(v).then((v) => v.toString())
        }),
      )
    }

    async function generate() {
      logger.info('Generating GraphQL files...')

      const documents: string[] = [
        ...(await autoImportDocuments()),
        ...options.documents,
      ].map((v) => inlineFragments(v, resolveAlias))

      ctx.templates = await generateTemplates(documents, options.codegenConfig)
      logger.success('Generated GraphQL files.')
    }

    await generate()

    // Watch for file changes.
    nuxt.hook('builder:watch', async (_event, path) => {
      if (!path.match(/\.(gql|graphql)$/)) {
        return
      }

      await generate()
      await nuxt.callHook('builder:generateApp')
    })

    const templates: string[] = [
      'graphql-operations.d.ts',
      'nuxt-graphql-middleware.d.ts',
      'graphql-documents.mjs',
    ]

    templates.forEach((filename) => {
      const result = addTemplate({
        write: true,
        filename,
        getContents: () => {
          return ctx.templates.find((v) => v.filename === filename).content
        },
      })

      if (result.dst.includes('graphql-documents.mjs')) {
        nuxt.options.alias['#graphql-operations'] = result.dst
      }
    })

    addPlugin(moduleResolver(runtimeDir, 'plugin'), {})

    addServerHandler({
      handler: moduleResolver('./runtime/serverHandler/index'),
      route: options.serverApiPrefix + '/:operation/:name',
    })
  },
}) as NuxtModule<ModuleOptions>
