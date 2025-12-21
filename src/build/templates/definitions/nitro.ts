import { OperationTypeNode } from 'graphql'
import { defineGeneratorTemplate } from './../defineTemplate'

/**
 * Types for the generated endpoints.
 */
export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/nitro', context: 'nitro' },
  null,
  (output, helper) => {
    const operations = output.getCollectedOperations()
    const serverApiPrefix = helper.options.serverApiPrefix
    const endpoints: string[] = []
    const imports: string[] = []

    for (const operation of operations) {
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
