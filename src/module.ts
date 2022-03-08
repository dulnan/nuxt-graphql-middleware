import { fileURLToPath } from 'url'
import fs from 'fs'
import { dirname, resolve } from 'pathe'
import mkdirp from 'mkdirp'
import chokidar from 'chokidar'
import {
  defineNuxtModule,
  addPlugin,
  resolveAlias,
  addServerMiddleware,
} from '@nuxt/kit'
import consola from 'consola'
import defu from 'defu'
import codegen, { GraphqlMiddlewareCodegenConfig } from './codegen'
import { GraphqlMiddlewarePluginConfig } from './runtime/plugin'
import { GraphqlServerMiddlewareConfig } from './runtime/serverMiddleware'
import graphqlImport from './graphqlImport'

const logger = consola.withTag('nuxt-graphql-middleware')

export interface GraphqlMiddlewareConfig {
  graphqlServer: string
  typescript?: GraphqlMiddlewareCodegenConfig
  endpointNamespace?: string
  debug: boolean
  queries: Record<string, string>
  mutations: Record<string, string>
  outputPath: string
  plugin?: GraphqlMiddlewarePluginConfig
  server?: GraphqlServerMiddlewareConfig
}

enum FileType {
  Query = 'query',
  Mutation = 'mutation',
}

interface FileMapItem {
  type: FileType
  name: string
  file: string
}

/**
 * Resolve the given GraphQL file by inlining all fragments.
 */
function resolveGraphqlFile(file: string, resolver: any): Promise<string> {
  return fs.promises
    .readFile(file)
    .then((buffer) => buffer.toString())
    .then((source) => graphqlImport(source, resolver))
}

/**
 * Write a file.
 */
function writeSource(
  dest: string,
  type: string,
  name: string,
  source: string,
  fileType: string = 'graphql'
) {
  const fileName = `${type}.${name}.${fileType}`
  const out = resolve(dest, fileName)
  return fs.promises.writeFile(out, source)
}

/**
 * Resolves, merges and writes the given GraphQL files.
 */
export function resolveGraphql(
  files: Record<string, string>,
  map: Map<string, string>,
  resolver: any,
  filesMap: Map<string, FileMapItem>,
  type: FileType,
  outputPath: string
) {
  return Promise.all(
    Object.keys(files).map((name) => {
      const filePath = files[name]
      const file = resolver(filePath)
      return resolveGraphqlFile(file, resolver).then((source) => {
        map.set(name, source)
        if (outputPath) {
          writeSource(outputPath, type, name, source)
        }
        filesMap.set(file, {
          type,
          name,
          file: filePath,
        })
      })
    })
  )
}

export default defineNuxtModule<GraphqlMiddlewareConfig>({
  meta: {
    name: 'nuxt-graphql-middleware',
    configKey: 'graphqlMiddleware',
  },
  defaults: {
    graphqlServer: '/graphql',
    queries: {},
    mutations: {},
    plugin: {
      enabled: true,
      cacheInServer: false,
      cacheInBrowser: true,
    },
    debug: false,
    outputPath: '~/graphql_queries',
    typescript: {
      enabled: true,
      resolvedQueriesPath: '~/graphql_queries',
      schemaOutputPath: '~/schema',
      typesOutputPath: '~/types',
      schemaOptions: {},
      skipSchemaDownload: process.env.NODE_ENV === 'production',
    },
    server: {
      port: process.env.NUXT_PORT ?? 3000,
    },
  },
  async setup(options, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    if (options.plugin.enabled) {
      nuxt.options.build.transpile.push(runtimeDir)

      nuxt.options.publicRuntimeConfig.graphqlMiddleware = {
        namespace: options.endpointNamespace,
        port: options.server.port || 3000,
        cacheInBrowser: options.plugin?.cacheInBrowser ? 'true' : 'false',
        cacheInServer: options.plugin?.cacheInServer ? 'true' : 'false',
      }

      addPlugin(resolve(runtimeDir, 'plugin'))
    }

    const resolver = resolveAlias

    const fileMap: Map<string, FileMapItem> = new Map()
    const queries = new Map()
    const mutations = new Map()

    const outputPath = options.outputPath ? resolver(options.outputPath) : ''
    await mkdirp(outputPath)

    const schemaOutputPath = resolver(options.typescript?.schemaOutputPath)
    const typesOutputPath = resolver(options.typescript?.typesOutputPath)
    const { generateSchema, generateTypes } = codegen(options.graphqlServer, {
      resolvedQueriesPath: resolver(options.outputPath),
      schemaOptions: options.typescript?.schemaOptions,
      skipSchemaDownload: options.typescript?.skipSchemaDownload,
      schemaOutputPath,
      typesOutputPath,
    })

    if (options.typescript?.enabled) {
      if (!outputPath) {
        throw new Error('TypeScript enabled, but no outputPath given.')
      }
      await mkdirp(schemaOutputPath)
      await generateSchema()
    }

    /**
     * Build all queries and mutations.
     */
    function build() {
      logger.log('Building GraphQL files...')
      return Promise.all([
        resolveGraphql(
          options.queries,
          queries,
          resolver,
          fileMap,
          FileType.Query,
          outputPath
        ),
        resolveGraphql(
          options.mutations,
          mutations,
          resolver,
          fileMap,
          FileType.Mutation,
          outputPath
        ),
      ]).then(() => {
        logger.success('Finished building GraphQL files')
        logger.success('Updating Runtime')

        const outputQueries = JSON.stringify(
          Array.from(queries.entries()),
          null,
          2
        )
        writeSource(outputPath, 'queries', 'all', outputQueries, 'json')

        if (options.typescript?.enabled) {
          return generateTypes().then(() => {
            logger.success('Finished generating GraphQL TypeScript files.')
          })
        }
      })
    }

    /**
     * Watch *.graphql files and rebuild everything on change.
     */
    function watchFiles() {
      const ignored = ['node_modules', '.nuxt']
      if (options.outputPath) {
        ignored.push(options.outputPath)
      }
      const filesWatcher = chokidar.watch('./**/*.graphql', {
        ignoreInitial: true,
        ignored,
      })

      if (filesWatcher) {
        logger.info('Watching for query changes')
        filesWatcher.on('change', () => {
          build()
        })
      }

      return filesWatcher
    }

    let watcher: any

    if (nuxt.options.dev) {
      nuxt.hook('build:done', () => {
        watcher = watchFiles()
      })

      nuxt.hook('close', () => {
        if (watcher) {
          watcher.close()
          watcher = undefined
        }
      })
    }

    build().then(() => {
      if (options.debug) {
        logger.info('Available queries and mutations:')
        console.table(
          Array.from(fileMap.entries()).map(([_key, value]) => value)
        )
      }
    })

    // Default runtime config.
    nuxt.options.privateRuntimeConfig.graphqlMiddlewareServer = defu(
      nuxt.options.privateRuntimeConfig.graphqlMiddlewareServer,
      {
        graphqlServer: options.graphqlServer,
        nuxtRootDir: nuxt.options.rootDir,
      }
    )

    addServerMiddleware({
      path: options.endpointNamespace,
      handler: resolve(runtimeDir, 'serverMiddleware'),
    })
  },
})
