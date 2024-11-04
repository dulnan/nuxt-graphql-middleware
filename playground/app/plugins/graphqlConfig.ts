import { useGraphqlState, defineNuxtPlugin, useCurrentLanguage } from '#imports'

/**
 * This is only called when performing a query or mutation from within the nuxt
 * app (e.g. not via custom server routes).
 */
export default defineNuxtPlugin({
  name: 'playground-state-plugin',
  dependsOn: ['nuxt-graphql-middleware-provide-state'],
  setup() {
    const state = useGraphqlState()
    const language = useCurrentLanguage()

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
        if (!options.headers) {
          options.headers = new Headers()
        }

        options.headers.set(
          'x-nuxt-header-client',
          'The header value from the client',
        )
        options.params.t = Date.now()
        options.params.lang_from_plugin = language.value
      },

      async onResponse(ctx) {
        const data = ctx.response?._data?.data
      },
    }
  },
})
