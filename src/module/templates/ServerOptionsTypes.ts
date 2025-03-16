import type { ModuleHelper } from '../ModuleHelper'

export default function (helper: ModuleHelper) {
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
}
