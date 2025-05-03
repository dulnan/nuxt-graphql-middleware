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
export const importMetaServer = import.meta.server
export const importMetaClient = import.meta.client
`
  },
  () => {
    return `
declare export const experimentalQueryParamEncoding: boolean
declare export const clientCacheEnabledAtBuild: boolean
declare export const importMetaServer: boolean
declare export const importMetaClient: boolean
`
  },
)
