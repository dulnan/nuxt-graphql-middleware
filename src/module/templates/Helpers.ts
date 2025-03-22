import type { ModuleHelper } from '../ModuleHelper'

export default function (helper: ModuleHelper) {
  return `export const serverApiPrefix = '${helper.options.serverApiPrefix}'
export function getEndpoint(operation, operationName) {
  return serverApiPrefix + '/' + operation + '/' + operationName
}
`
}
