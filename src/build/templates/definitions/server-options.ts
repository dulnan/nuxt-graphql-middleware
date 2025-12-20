import { defineStaticTemplate } from './../defineTemplate'

/**
 * Imports and exports the user's server options file.
 */
export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/server-options' },
  (helper) => {
    const resolvedPathRelative = helper.paths.serverOptions
      ? helper.toModuleBuildRelative(helper.paths.serverOptions)
      : null
    const serverOptionsLine = resolvedPathRelative
      ? `import serverOptions from '${resolvedPathRelative}'`
      : `const serverOptions = {}`
    return `
${serverOptionsLine}
export { serverOptions }
`
  },
  (helper) => {
    // Type template when server options exist.
    if (helper.paths.serverOptions) {
      const resolvedPathRelative = helper.toModuleBuildRelative(
        helper.paths.serverOptions,
      )

      return `
import type { GraphqlMiddlewareServerOptions } from '${helper.paths.runtimeTypes}'
import serverOptionsImport from '${resolvedPathRelative}'

type AdditionsFromServerOptions = typeof serverOptionsImport extends GraphqlMiddlewareServerOptions<infer R, any, any> ? R : {}

export type GraphqlResponseAdditions = Omit<AdditionsFromServerOptions, 'data' | 'errors'>

export declare const serverOptions: GraphqlMiddlewareServerOptions
`
    }

    // Fallback type template when no server options exist.
    return `
import type { GraphqlMiddlewareServerOptions } from '${helper.paths.runtimeTypes}'

export declare const serverOptions: GraphqlMiddlewareServerOptions

export type GraphqlResponseAdditions = object
`
  },
)
