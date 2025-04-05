import { defineGeneratorTemplate } from './../defineTemplate'

/**
 * Template for the middleware response types.
 */
export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/response' },
  null,
  (output, helper) => {
    const operations = output.getCollectedOperations()
    const allTypes = operations.map((v) => v.typeName).sort()

    return `import type {
  ${allTypes.join(',\n  ')}
} from './../graphql-operations'
import type { GraphqlResponseAdditions } from './server-options'
import type { GraphqlServerResponse } from '${helper.paths.runtimeTypes}'

declare module '#nuxt-graphql-middleware/response' {
  export type GraphqlMiddlewareResponseUnion =
    | ${allTypes.join('\n    | ') || 'never'}

  export type GraphqlResponse<T> = GraphqlServerResponse<T> & GraphqlResponseAdditions
  export type GraphqlResponseTyped = GraphqlResponse<GraphqlMiddlewareResponseUnion>
}`
  },
)
