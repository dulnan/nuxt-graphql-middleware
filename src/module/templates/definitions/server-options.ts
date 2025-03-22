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
    const resolvedPathRelative = helper.paths.serverOptions
      ? helper.toModuleBuildRelative(helper.paths.serverOptions)
      : null
    const serverOptionsLineTypes = resolvedPathRelative
      ? `import serverOptions from '${resolvedPathRelative}'`
      : `const serverOptions: GraphqlMiddlewareServerOptions = {}`

    const moduleTypesPath = helper.toModuleBuildRelative(
      helper.resolvers.module.resolve('./types'),
    )

    return `
import type { GraphqlMiddlewareServerOptions } from '${moduleTypesPath}'
${serverOptionsLineTypes}

export type GraphqlResponseAdditions =
  typeof serverOptions extends GraphqlMiddlewareServerOptions<infer R, any, any> ? R : {}

export { serverOptions }`
  },
)
