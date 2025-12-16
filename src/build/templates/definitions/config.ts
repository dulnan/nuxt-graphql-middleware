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
export declare const experimentalQueryParamEncoding: boolean
export declare const clientCacheEnabledAtBuild: boolean
export declare const importMetaServer: boolean
export declare const importMetaClient: boolean
`
  },
)
