import { defineStaticTemplate } from './../defineTemplate'

/**
 * Imports and exports the user's client options file.
 */
export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/client-options' },
  (helper) => {
    if (helper.paths.clientOptions) {
      const pathRelative = helper.toModuleBuildRelative(
        helper.paths.clientOptions,
      )
      return `import clientOptions from '${pathRelative}'
export { clientOptions }
`
    }

    return `export const clientOptions = undefined`
  },
  (helper) => {
    if (helper.paths.clientOptions) {
      const pathRelative = helper.toModuleBuildRelative(
        helper.paths.clientOptions,
      )
      return `import type { GraphqlClientOptions } from '${helper.paths.runtimeTypes}'
import clientOptionsImport from '${pathRelative}'

declare export const clientOptions: GraphqlClientOptions|undefined
export type GraphqlClientContext = typeof clientOptionsImport extends GraphqlClientOptions<infer R> ? R : {}
`
    }

    return `
import type { GraphqlClientOptions } from '${helper.paths.runtimeTypes}'

declare export const clientOptions: GraphqlClientOptions|undefined
export type GraphqlClientContext = {}
`
  },
)
