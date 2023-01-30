import { defineNuxtConfig } from 'nuxt/config'
import { GraphqlMiddlewareConfig } from '../src/types'
import graphqlMiddlewareModule from './../src/module'

const graphqlMiddleware: GraphqlMiddlewareConfig = {
  graphqlEndpoint: 'http://localhost:4000',
  downloadSchema: false,
  // serverFetchOptions: function () {},
}

export default defineNuxtConfig({
  modules: [graphqlMiddlewareModule],
  graphqlMiddleware,
})
