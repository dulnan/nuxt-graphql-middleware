import {
  GraphqlMiddlewareQueryName,
  GetQueryArgs,
  QueryObjectArgs,
  GetQueryResult,
} from './shared'
import { buildRequestParams } from './../helpers'
import { performRequest } from './nuxtApp'
import type { GraphqlMiddlewareQuery } from '#build/nuxt-graphql-middleware'

/**
 * Performs a GraphQL query.
 */
export function useGraphqlQuery<T extends GraphqlMiddlewareQueryName>(
  ...args:
    | GetQueryArgs<T, GraphqlMiddlewareQuery>
    | [QueryObjectArgs<T, GraphqlMiddlewareQuery>]
): Promise<GetQueryResult<T, GraphqlMiddlewareQuery>> {
  const [name, variables, fetchOptions = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1]]
      : [args[0].name, args[0].variables, args[0].fetchOptions]

  return performRequest('query', name, 'get', {
    params: buildRequestParams(variables),
    ...fetchOptions,
  }) as Promise<GetQueryResult<T, GraphqlMiddlewareQuery>>
}
