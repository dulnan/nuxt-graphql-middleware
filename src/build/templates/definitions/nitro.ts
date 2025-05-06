import { OperationTypeNode } from 'graphql'
import { defineGeneratorTemplate } from './../defineTemplate'

/**
 * Types for the generated endpoints.
 */
export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/nitro' },
  null,
  (output, helper) => {
    const operations = output.getCollectedOperations()
    const serverApiPrefix = helper.options.serverApiPrefix
    const endpoints: string[] = []
    const imports: string[] = []

    for (const operation of operations) {
      // Ignore subscriptions, because they are handled via WebSocket.
      if (operation.operationType === OperationTypeNode.SUBSCRIPTION) {
        continue
      }

      imports.push(operation.typeName)
      const method =
        operation.operationType === OperationTypeNode.QUERY ? 'get' : 'post'
      endpoints.push(
        `    '${serverApiPrefix}/${operation.operationType}/${operation.graphqlName}': {
      '${method}': GraphqlResponse<${operation.typeName}>
    }`,
      )
    }

    return `import type { GraphqlResponse } from './response'
import type {
  ${imports.sort().join(',\n  ')}
} from './../graphql-operations'

declare module 'nitropack/types' {
  interface InternalApi {
${endpoints.sort().join('\n')}
  }
}`
  },
)
