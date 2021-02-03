import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'
import chokidar from 'chokidar'
import { Context, Module } from '@nuxt/types'
import consola from 'consola'
import serverMiddleware, {
  GraphqlServerMiddlewareConfig,
} from './serverMiddleware'
import graphqlImport from './graphqlImport'
import { GraphqlMiddlewarePluginConfig } from './plugin'

const logger = consola.withTag('nuxt-graphql-middleware')

const PLUGIN_PATH = path.resolve(__dirname, 'plugin.js')

export interface GraphqlMiddlewareConfig {
  graphqlServer: string
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

function resolveGraphqlFile(file: string, resolver: any): Promise<string> {
  return fs.promises
    .readFile(file)
    .then((buffer) => buffer.toString())
    .then((source) => graphqlImport(source, resolver))
}

function writeSource(dest: string, filePath: string, source: string) {
  const fileName = path.basename(filePath)
  const out = path.resolve(dest, fileName)
  return fs.promises.writeFile(out, source)
}

function resolveGraphql(
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
          writeSource(outputPath, filePath, source)
        }
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
const graphqlMiddleware: Module = async function () {
  const options = this.options
  const provided = (this.options.graphqlMiddleware ||
    {}) as Partial<GraphqlMiddlewareConfig>

  const config: GraphqlMiddlewareConfig = {
    graphqlServer: provided.graphqlServer || '',
    endpointNamespace: provided.endpointNamespace || '/__graphql_middleware',
    debug: provided.debug || options.dev,
    queries: provided.queries || {},
    mutations: provided.mutations || {},
    outputPath: provided.outputPath || '',
    server: provided.server,
    plugin: {
      enabled: !!provided.plugin?.enabled,
      cacheInBrowser: !!provided.plugin?.cacheInBrowser,
      cacheInServer: !!provided.plugin?.cacheInServer,
    },
  }
  const resolver = this.nuxt.resolver.resolvePath

  // Add the API helper plugin.
  if (config.plugin?.enabled) {
    this.addPlugin({
      src: PLUGIN_PATH,
      options: {
        namespace: config.endpointNamespace,
        cacheInBrowser: config.plugin?.cacheInBrowser ? 'true' : 'false',
        cacheInServer: config.plugin?.cacheInServer ? 'true' : 'false',
      },
    })
  }

  const fileMap: Map<string, FileMapItem> = new Map()
  const queries = new Map()
  const mutations = new Map()

  const outputPath = config.outputPath ? resolver(config.outputPath) : ''
  if (outputPath) {
    await mkdirp(outputPath)
  }

  /**
   * Build all queries and mutations.
   */
  function build() {
    logger.log('Building GraphQL files...')
    return Promise.all([
      resolveGraphql(
        config.queries,
        queries,
        resolver,
        fileMap,
        FileType.Query,
        outputPath
      ),
      resolveGraphql(
        config.mutations,
        mutations,
        resolver,
        fileMap,
        FileType.Mutation,
        outputPath
      ),
    ]).then(() => {
      logger.success('Finished building GraphQL files')
    })
  }

  /**
   * Watch *.graphql files and rebuild everything on change.
   */
  function watchFiles() {
    const ignored = ['node_modules', '.nuxt']
    if (config.outputPath) {
      ignored.push(config.outputPath)
    }
    const filesWatcher = (options._filesWatcher = chokidar.watch(
      './**/*.graphql',
      {
        ignoreInitial: true,
        ignored,
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
    handler: serverMiddleware(
      config.graphqlServer,
      queries,
      mutations,
      config.server
    ),
  })
}

export default graphqlMiddleware
