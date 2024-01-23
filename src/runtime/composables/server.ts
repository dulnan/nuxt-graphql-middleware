import type { FetchOptions } from 'ofetch'
import {
  type GraphqlResponse,
  getEndpoint,
  type GraphqlMiddlewareQueryName,
  type GetQueryArgs,
  type QueryObjectArgs,
  type GetQueryResult,
  type GraphqlMiddlewareMutationName,
  type GetMutationArgs,
  type MutationObjectArgs,
  type GetMutationResult,
} from './shared'
import { buildRequestParams } from './../helpers'
import type {
  GraphqlMiddlewareQuery,
  GraphqlMiddlewareMutation,
} from '#build/nuxt-graphql-middleware'

function performRequest(
  operation: string,
  operationName: string,
  method: 'get' | 'post',
  options: FetchOptions,
) {
  return $fetch<GraphqlResponse<any>>(getEndpoint(operation, operationName), {
    ...options,
    method,
  }).then((v) => {
    return {
      data: v.data,
      errors: v.errors || [],
    }
  })
}

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

/**
 * Performs a GraphQL mutation.
 */
export function useGraphqlMutation<T extends GraphqlMiddlewareMutationName>(
  ...args:
    | GetMutationArgs<T, GraphqlMiddlewareMutation>
    | [MutationObjectArgs<T, GraphqlMiddlewareMutation>]
): Promise<GetMutationResult<T, GraphqlMiddlewareMutation>> {
  const [name, body, fetchOptions = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1]]
      : [args[0].name, args[0].variables, args[0].fetchOptions]

  return performRequest('mutation', name, 'post', {
    body,
    ...fetchOptions,
  }) as Promise<GetMutationResult<T, GraphqlMiddlewareMutation>>
}
