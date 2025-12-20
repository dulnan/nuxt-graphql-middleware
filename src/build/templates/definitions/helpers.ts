import { defineStaticTemplate } from './../defineTemplate'

/**
 * Configuration template.
 */
export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/helpers', context: 'both' },
  (helper) => {
    return `export const serverApiPrefix = '${helper.options.serverApiPrefix}'
export function getEndpoint(operation, operationName) {
  return serverApiPrefix + '/' + operation + '/' + operationName
}
`
  },
  () => {
    return `export declare const serverApiPrefix: string
export declare function getEndpoint(operation: string, operationName: string): string`
  },
)
