import { defineNuxtConfig } from 'nuxt/config'
import graphqlMiddlewareModule from './../src/module'

const graphqlMiddleware = {
  graphqlEndpoint: 'http://localhost:4000',
  downloadSchema: false,
  // serverFetchOptions: function () {},
}

export default defineNuxtConfig({
  modules: [graphqlMiddlewareModule],
  graphqlMiddleware,
})
