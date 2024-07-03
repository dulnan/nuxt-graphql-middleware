import { defineNuxtPlugin } from '#imports'
import { type GraphqlMiddlewareState } from '#graphql-middleware/types'

/**
 * Create and provide the state singleton for the composables.
 */
export default defineNuxtPlugin({
  name: 'nuxt-graphql-middleware-provide-state',
  // We can set a very low order to make sure this plugin runs as early as
  // possible.
  order: -9999,
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
