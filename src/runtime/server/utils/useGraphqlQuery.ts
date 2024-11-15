import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import {
  type GraphqlMiddlewareQueryName,
  type GetQueryArgs,
  type QueryObjectArgs,
  type GetQueryResult,
  encodeContext,
} from './../../helpers/composables'
import { buildRequestParams } from './../../helpers'
import type { GraphqlMiddlewareQuery } from '#nuxt-graphql-middleware/generated-types'
import { performRequest } from '.'

/**
 * Performs a GraphQL query.
 */
export function useGraphqlQuery<
  T extends GraphqlMiddlewareQueryName,
  R extends GetQueryResult<T, GraphqlMiddlewareQuery>,
>(
  ...args:
    | GetQueryArgs<T, GraphqlMiddlewareQuery>
    | [QueryObjectArgs<T, GraphqlMiddlewareQuery>]
): Promise<GraphqlResponse<R>> {
  const [name, variables, fetchOptions = {}, clientContext = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1], args[2]?.fetchOptions, args[2]?.clientContext]
      : [
          args[0].name,
          args[0].variables,
          args[0].fetchOptions,
          args[0].clientContext,
        ]

  return performRequest<R>('query', name, 'get', {
    ...fetchOptions,
    params: {
      ...(fetchOptions.params || {}),
      ...buildRequestParams(variables),
      ...encodeContext(clientContext),
    },
  })
}
