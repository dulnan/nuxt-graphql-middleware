import path from 'path'
import fs from 'fs'
import chokidar from 'chokidar'
import { Context, Module } from '@nuxt/types'
import consola from 'consola'
import serverMiddleware from './serverMiddleware'
import graphqlImport from './graphqlImport'

const logger = consola.withTag('nuxt-graphql-middleware')

const PLUGIN_PATH = path.resolve(__dirname, 'plugin.js')

export interface GraphqlMiddlewareConfig {
  graphqlServer: string
  endpointNamespace?: string
  debug: boolean
  queries: Record<string, string>
  mutations: Record<string, string>
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

function resolveGraphqlFile(file: string, basedir: string): Promise<string> {
  return fs.promises
    .readFile(file)
    .then((buffer) => buffer.toString())
    .then((source) => graphqlImport(source, basedir))
}

function resolveGraphql(
  files: Record<string, string>,
  map: Map<string, string>,
  basedir: string,
  filesMap: Map<string, FileMapItem>,
  type: FileType
) {
  return Promise.all(
    Object.keys(files).map((name) => {
      const filePath = files[name]
      const file = path.resolve(basedir, filePath)
      return resolveGraphqlFile(file, basedir).then((source) => {
        map.set(name, source)
        filesMap.set(file, {
          type,
          name,
          file,
        })
      })
    })
  )
}

/*
 * Install the Nuxt GraphQL Middleware module.
 */
const graphqlMiddleware: Module = function () {
  const options = this.options
  const provided = (this.options.graphqlMiddleware ||
    {}) as Partial<GraphqlMiddlewareConfig>

  const config: GraphqlMiddlewareConfig = {
    graphqlServer: provided.graphqlServer || '',
    endpointNamespace: provided.endpointNamespace || '/__graphql_middleware',
    debug: provided.debug || options.dev,
    queries: provided.queries || {},
    mutations: provided.mutations || {},
  }
  const rootDir = this.options.rootDir

  // Add the API helper plugin.
  this.addPlugin({
    src: PLUGIN_PATH,
    options: {
      namespace: config.endpointNamespace,
    },
  })

  const fileMap: Map<string, FileMapItem> = new Map()
  const queries = new Map()
  const mutations = new Map()

  /**
   * Build all queries and mutations.
   */
  function build() {
    logger.log('Building GraphQL files...')
    return Promise.all([
      resolveGraphql(config.queries, queries, rootDir, fileMap, FileType.Query),
      resolveGraphql(
        config.mutations,
        mutations,
        rootDir,
        fileMap,
        FileType.Mutation
      ),
    ]).then(() => {
      logger.success('Finished building GraphQL files')
    })
  }

  /**
   * Watch *.graphql files and rebuild everything on change.
   */
  function watchFiles() {
    const filesWatcher = (options._filesWatcher = chokidar.watch(
      './**/*.graphql',
      {
        ignoreInitial: true,
      }
    ))

    if (filesWatcher) {
      logger.info('Watching for query changes')
      filesWatcher.on('change', () => {
        build()
      })
    }
  }

  this.nuxt.hook('build:done', () => {
    build().then(() => {
      if (options.debug) {
        logger.info('Available queries and mutations:')
        console.table(
          Array.from(fileMap.entries()).map(([_key, value]) => value)
        )
      }
    })
    if (this.nuxt.options.dev) {
      watchFiles()
    }
  })

  // Add out server middleware to manage the cache.
  this.addServerMiddleware({
    path: config.endpointNamespace,
    handler: serverMiddleware({
      graphqlServer: config.graphqlServer,
      queries,
      mutations,
    }),
  })
}

export default graphqlMiddleware
