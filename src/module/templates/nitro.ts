import type { GeneratorOutputOperation } from 'graphql-typescript-deluxe'
import { OperationTypeNode } from 'graphql'

export function generateNitroTypes(
  operations: readonly GeneratorOutputOperation[],
  serverApiPrefix: string,
) {
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
}
