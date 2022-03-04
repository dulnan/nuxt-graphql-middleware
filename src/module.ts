import { resolve } from 'path'
import { fileURLToPath } from 'url'
import {defineNuxtModule, addPlugin, addPluginTemplate} from '@nuxt/kit'
import {GraphqlMiddlewareCodegenConfig} from "./codegen";
import {GraphqlMiddlewarePluginConfig} from "./templates/plugin";
import {GraphqlServerMiddlewareConfig} from "./serverMiddleware";

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

export default defineNuxtModule<GraphqlMiddlewareConfig>({
  meta: {
    name: 'nuxt-graphql-middleware',
    configKey: 'graphqlMiddleware'
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
    outputPath: './graphql_queries',

    typescript: {
      enabled: true,
      resolvedQueriesPath: '~/graphql_queries',
      schemaOutputPath: './schema',
      typesOutputPath: '~/types',
      schemaOptions: {},
      skipSchemaDownload: process.env.NODE_ENV === 'production',
    },
    server: {
      port: process.env.NUXT_PORT
    }
  },
  setup (options, nuxt) {
    if (options.plugin.enabled) {
      const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
      nuxt.options.build.transpile.push(runtimeDir)


      nuxt.options.publicRuntimeConfig.graphqlMiddleware = {
        namespace: options.endpointNamespace,
        port: options.server.port || 3000,
        cacheInBrowser: options.plugin?.cacheInBrowser ? 'true' : 'false',
        cacheInServer: options.plugin?.cacheInServer ? 'true' : 'false',
      };

      addPlugin(resolve(runtimeDir, 'plugin'))
    }




  }
})
