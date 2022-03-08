import { defineNuxtConfig } from 'nuxt3'
import NuxtGraphQLMiddleware from '..'
import { AllFilmsDocument, FilmByIdDocument } from './types/graphql-operations'

export default defineNuxtConfig({
  modules: [NuxtGraphQLMiddleware],
  graphqlMiddleware: {
    // Example: https://studio.apollographql.com/sandbox/explorer
    graphqlServer: `https://swapi-graphql.netlify.app/.netlify/functions/index`,
    queries: {
      film: '~/pages/film/film.graphql',
      filmList: '~/pages/filmlist.graphql',
    },
    types: {
      film: FilmByIdDocument,
      filmList: AllFilmsDocument,
    },
    mutations: {},
    plugin: {
      enabled: true,
      cacheInServer: false,
      cacheInBrowser: true,
    },
    endpointNamespace: '/__graphql_middleware',
    debug: true,
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
      buildHeaders(req, name, type) {
        // If we have cookies, pass them along to the server request.
        const auth = req.headers.authorization
        if (auth) {
          return {
            Authorization: auth,
          }
        }

        return {}
      },
      onQueryError(error, req, res) {
        console.log(error)
        res.send(500)
      },
      port: process.env.NUXT_PORT ?? 3000,
    },
  },
})
