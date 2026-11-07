import { defineNuxtPlugin, useAppConfig } from '#imports'

/**
 * Disable the client cache when the URL contains "?clientCache=off".
 *
 * Used by the Cypress tests, as the playground enables the client cache.
 */
export default defineNuxtPlugin(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('clientCache') === 'off') {
    useAppConfig().graphqlMiddleware.clientCacheEnabled = false
  }
})
