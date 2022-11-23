import { defineNuxtConfig } from 'nuxt/config'
import Module from './..'

export default defineNuxtConfig({
  modules: [Module],
  graphqlMiddleware: {
    graphqlEndpoint: 'http://localhost:4000',
  },
})
