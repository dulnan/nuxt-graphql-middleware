import type { ModuleHelper } from '../ModuleHelper'

export default function (helper: ModuleHelper) {
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
}
