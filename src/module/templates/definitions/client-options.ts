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

    return `export const clientOptions = {}`
  },
  (helper) => {
    if (helper.paths.clientOptions) {
      const pathRelative = helper.toModuleBuildRelative(
        helper.paths.clientOptions,
      )
      return `import type { GraphqlClientOptions } from '${helper.paths.runtimeTypes}'
import { clientOptions } from '${pathRelative}'

export type GraphqlClientContext = typeof clientOptions extends GraphqlClientOptions<infer R> ? R : {}

export { clientOptions }`
    }

    return `
import type { GraphqlClientOptions } from '${helper.paths.runtimeTypes}'
export const clientOptions: GraphqlClientOptions

export type GraphqlClientContext = {}
`
  },
)
