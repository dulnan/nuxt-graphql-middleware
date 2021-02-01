import path from 'path'
import fs from 'fs'
import chokidar from 'chokidar'
import { Context, Module } from '@nuxt/types'
import serverMiddleware from './serverMiddleware'
import graphqlImport from './graphqlImport'
import consola from 'consola'

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
  Mutation = 'mutation'
}

interface FileMapItem {
  type: FileType
  name: string
  file: string
}

function resolveGraphqlFile(file: string, basedir: string) {
  return graphqlImport(fs.readFileSync(file).toString(), basedir)
}


/*
 * Attaches a custom renderRoute method.
 *
 * It will store the SSR result in a local cache, if it is deemed cacheable.
 * Only anonymous requests (using the backend "API" user) will receive a cached
 * response.
 */
const graphqlMiddleware: Module = function () {
  const nuxt: any = this.nuxt
  const options = this.options
  const provided = (this.options.graphqlMiddleware || {}) as Partial<GraphqlMiddlewareConfig>
  const config: GraphqlMiddlewareConfig = {
    graphqlServer: provided.graphqlServer || '',
    endpointNamespace: provided.endpointNamespace || '/__graphql_middleware',
    debug: provided.debug || options.dev,
    queries: provided.queries || {},
    mutations: provided.mutations || {},
  }
  const rootDir = this.options.rootDir

  // Add the cache helper plugin.
  this.addPlugin({
    src: PLUGIN_PATH,
    options: {
      namespace: config.endpointNamespace
    }
  })

  const fileMap: Map<string, FileMapItem> = new Map()
  const queries = new Map()
  const mutations = new Map()

  function resolveGraphql(files: Record<string, string>, map: Map<string, string>, basedir: string, filesMap: Map<string, FileMapItem>, type: FileType) {
    return Object.keys(files).map(name => {
      const filePath = files[name]
      const file = path.resolve(basedir, filePath)
      const source = resolveGraphqlFile(file, basedir)
      filesMap.set(file, {
        type,
        name,
        file
      })
        return {
          filePath,
          name,
          source
        }
    }).forEach((item) => {
      map.set(item.name, item.source)
    })
  }

  function build() {
    logger.log('Building GraphQL files...')
    resolveGraphql(config.queries, queries, rootDir, fileMap, FileType.Query)
    resolveGraphql(config.mutations, mutations, rootDir, fileMap, FileType.Mutation)
    logger.success('Finished building GraphQL files')
  }

  function watchFiles() {
    const filesWatcher = options._filesWatcher = chokidar.watch('./**/*.graphql', {
      ignoreInitial: true
    })

    if (filesWatcher) {
      logger.info('Watching for query changes')
      filesWatcher.on('change', () => {
        build()
      })
    }
  }

  this.nuxt.hook('build:done', () => {
    build()
    if (options.debug) {
      logger.info('Available queries and mutations:')
      console.table(Array.from(fileMap.entries()).map(([_key, value]) => value))
    }
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
