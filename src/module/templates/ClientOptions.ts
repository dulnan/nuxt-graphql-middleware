import type { ModuleHelper } from '../ModuleHelper'

export default function (helper: ModuleHelper) {
  if (helper.paths.clientOptions) {
    const pathRelative = helper.toModuleBuildRelative(
      helper.paths.clientOptions,
    )
    return `import clientOptions from '${pathRelative}'
export { clientOptions }
`
  }

  return `export const clientOptions = {}`
}
