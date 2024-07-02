import { defineNuxtPlugin } from 'nuxt/app'
import { useGraphqlState } from '../.nuxt/imports'

/**
 * This is only called when performing a query or mutation from within the nuxt
 * app (e.g. not via custom server routes).
 */
export default defineNuxtPlugin(() => {
  const state = useGraphqlState()
  if (!state) {
    return
  }
  state.fetchOptions = {
    onRequest({ request, options }) {
      // Log request
      console.log('[fetch request]', request)

      // Add `?t=1640125211170` to query params
      if (!options.params) {
        options.params = {}
      }
      options.headers = {
        'x-nuxt-header-client': 'The header value from the client',
      }
      options.params.t = Date.now()
    },

    async onResponse(ctx) {
      const data = ctx.response?._data?.data
    },
  }
})
