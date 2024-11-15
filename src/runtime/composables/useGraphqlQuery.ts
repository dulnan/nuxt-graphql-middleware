import {
  type GraphqlMiddlewareQueryName,
  type GetQueryArgs,
  type QueryObjectArgs,
  type GetQueryResult,
  encodeContext,
} from './shared'
import { buildRequestParams } from './../helpers'
import { performRequest } from './nuxtApp'
import { clientOptions } from '#graphql-middleware-client-options'
import type { GraphqlMiddlewareQuery } from '#nuxt-graphql-middleware/generated-types'
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'

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
  const [
    name,
    variables,
    fetchOptions = {},
    graphqlCaching = {},
    overrideClientContext = {},
  ] =
    typeof args[0] === 'string'
      ? [
          args[0],
          args[1],
          args[2]?.fetchOptions,
          args[2]?.graphqlCaching,
          args[2]?.clientContext,
        ]
      : [
          args[0].name,
          args[0].variables,
          args[0].fetchOptions,
          args[0].graphqlCaching,
          args[0].clientContext,
        ]

  const globalClientContext = clientOptions.buildClientContext
    ? encodeContext(clientOptions.buildClientContext())
    : {}

  const clientContext = {
    ...globalClientContext,
    ...overrideClientContext,
  }

  return performRequest<R>(
    'query',
    name,
    'get',
    {
      params: {
        ...buildRequestParams(variables),
        ...clientContext,
      },
      ...fetchOptions,
    },
    graphqlCaching,
  )
}
