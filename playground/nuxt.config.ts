import { defineNuxtConfig } from 'nuxt'
import NuxtGraphQLMiddleware from '..'

export default defineNuxtConfig({
  modules: [NuxtGraphQLMiddleware],
  graphqlMiddleware: {
    graphqlEndpoint:
      'https://swapi-graphql.netlify.app/.netlify/functions/index',
  },
})
