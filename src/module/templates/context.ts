import type { GeneratorOutputOperation } from 'graphql-typescript-deluxe'
import type { ModuleContext } from '../types'

export function generateResponseTypeTemplate(
  operations: readonly GeneratorOutputOperation[],
  context: ModuleContext,
): string {
  const allTypes = operations.map((v) => v.typeName).sort()

  return `import type {
  ${allTypes.join(',\n  ')}
} from './../graphql-operations'
import type { GraphqlResponseAdditions } from './server-options'
import type { GraphqlServerResponse } from '${context.runtimeTypesPath}'

declare module '#nuxt-graphql-middleware/response' {
  export type GraphqlMiddlewareResponseUnion =
    | ${allTypes.join('\n  | ') || 'never'}

  export type GraphqlResponse<T> = GraphqlServerResponse<T> & GraphqlResponseAdditions
  export type GraphqlResponseTyped = GraphqlResponse<GraphqlMiddlewareResponseUnion>
}`
}
