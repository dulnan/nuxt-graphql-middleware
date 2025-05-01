import { defineStaticTemplate } from './../defineTemplate'

/**
 * Static module configuration.
 */
export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/config' },
  (helper) => {
    const experimentalQueryParamEncoding =
      !!helper.options.experimental.improvedQueryParamEncoding
    return `
export const experimentalQueryParamEncoding = ${JSON.stringify(experimentalQueryParamEncoding)}
`
  },
  () => {
    return `
declare export const experimentalQueryParamEncoding: boolean
`
  },
)
