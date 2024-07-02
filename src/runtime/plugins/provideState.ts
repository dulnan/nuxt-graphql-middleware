import { defineNuxtPlugin } from 'nuxt/app'
import { type GraphqlMiddlewareState } from './../../types'

/**
 * Create and provide the state singleton for the composables.
 */
export default defineNuxtPlugin({
  name: 'nuxt-graphql-middleware-provide-state',
  setup() {
    const graphqlState: GraphqlMiddlewareState = {
      fetchOptions: {},
    }
    return {
      provide: {
        graphqlState,
      },
    }
  },
})
