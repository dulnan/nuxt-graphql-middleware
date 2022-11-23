import { defineNuxtPlugin } from 'nuxt/app'
import { useGraphqlState } from '../.nuxt/imports'

export default defineNuxtPlugin(() => {
  const state = useGraphqlState()
  state.fetchOptions = {
    onRequest({ request, options }) {
      // Log request
      console.log('[fetch request]', request, options)

      // Add `?t=1640125211170` to query params
      if (!options.params) {
        options.params = {}
      }
      options.params.t = Date.now()
    },
  }
})
