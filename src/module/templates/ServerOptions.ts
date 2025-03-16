import type { ModuleHelper } from '../ModuleHelper'

export default function (helper: ModuleHelper) {
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
}
