import { defineStaticTemplate } from './../defineTemplate'

/**
 * Static module configuration.
 */
export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/config' },
  (helper) => {
    const experimentalQueryParamEncoding =
      !!helper.options.experimental.improvedQueryParamEncoding
    const clientCacheEnabledAtBuild = !!helper.options.clientCache.enabled
    return `
export const experimentalQueryParamEncoding = ${JSON.stringify(experimentalQueryParamEncoding)}
export const clientCacheEnabledAtBuild = ${JSON.stringify(clientCacheEnabledAtBuild)}
`
  },
  () => {
    return `
declare export const experimentalQueryParamEncoding: boolean
declare export const clientCacheEnabledAtBuild: boolean
`
  },
)
