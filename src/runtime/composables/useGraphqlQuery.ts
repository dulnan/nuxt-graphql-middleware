import {
  type GetQueryArgs,
  type QueryObjectArgs,
  type GetQueryResult,
  encodeContext,
} from './../helpers/composables'
import { buildRequestParams } from './../helpers'
import { performRequest } from './nuxtApp'
import { clientOptions } from '#nuxt-graphql-middleware/client-options'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import type { Query } from '#nuxt-graphql-middleware/operations'

/**
 * Performs a GraphQL query.
 */
export function useGraphqlQuery<
  K extends keyof Query,
  R extends GetQueryResult<K>,
>(
  ...args: GetQueryArgs<K> | [QueryObjectArgs<K>]
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
    ? clientOptions.buildClientContext()
    : {}

  return performRequest<R>(
    'query',
    name,
    'get',
    {
      ...fetchOptions,
      params: {
        ...(fetchOptions.params || {}),
        ...buildRequestParams(variables),
        ...encodeContext({
          ...globalClientContext,
          ...overrideClientContext,
        }),
      },
    },
    graphqlCaching,
  )
}
