export default defineNuxtPlugin((NuxtApp) => {
  const state = useGraphqlState()
  state.value.fetchOptions = {
    headers: {
      foobar: 'test',
    },
    async onRequest({ request, options }) {
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
