import { defineStaticTemplate } from './../defineTemplate'

/**
 * Configuration template.
 */
export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/helpers' },
  (helper) => {
    return `export const serverApiPrefix = '${helper.options.serverApiPrefix}'
export function getEndpoint(operation, operationName) {
  return serverApiPrefix + '/' + operation + '/' + operationName
}
`
  },
  () => {
    return `export const serverApiPrefix: string;
export function getEndpoint(operation: string, operationName: string): string`
  },
)
