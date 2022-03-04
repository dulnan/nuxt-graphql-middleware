import { defineNuxtConfig } from 'nuxt3'
import NuxtGraphQLMiddleware from '..'

export default defineNuxtConfig({
  modules: [
    NuxtGraphQLMiddleware
  ],
  graphqlMiddleware: {
    // Example: https://studio.apollographql.com/sandbox/explorer
    graphqlServer: `https://swapi-graphql.netlify.app/.netlify/functions/index`,
    queries: {
      filmList: '~/queries/list/filmlist.graphql',
    },
    mutations: {},
    plugin: {
      enabled: true,
      cacheInServer: false,
      cacheInBrowser: true,
    },
    endpointNamespace: '/__graphql_middleware',
    debug: true,
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
      port: process.env.PORT
    }
  },
})
