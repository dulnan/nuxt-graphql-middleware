import { defineNuxtPlugin } from 'nuxt/app'
import { GraphqlMiddlewareState } from './../../types'

/**
 * Create and provide the state singleton for the composables.
 */
export default defineNuxtPlugin((app) => {
  const state: GraphqlMiddlewareState = {
    fetchOptions: {},
  }
  app.provide('graphqlState', state)
})
