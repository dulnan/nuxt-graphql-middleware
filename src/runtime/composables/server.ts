import type { FetchOptions } from 'ofetch'
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import {
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

function performRequest<T>(
  operation: string,
  operationName: string,
  method: 'get' | 'post',
  options: FetchOptions,
): Promise<GraphqlResponse<T>> {
  return $fetch<GraphqlResponse<T>>(getEndpoint(operation, operationName), {
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
export function useGraphqlQuery<
  T extends GraphqlMiddlewareQueryName,
  R extends GetQueryResult<T, GraphqlMiddlewareQuery>,
>(
  ...args:
    | GetQueryArgs<T, GraphqlMiddlewareQuery>
    | [QueryObjectArgs<T, GraphqlMiddlewareQuery>]
): Promise<GraphqlResponse<R>> {
  const [name, variables, fetchOptions = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1]]
      : [args[0].name, args[0].variables, args[0].fetchOptions]

  return performRequest<R>('query', name, 'get', {
    params: buildRequestParams(variables),
    ...fetchOptions,
  })
}

/**
 * Performs a GraphQL mutation.
 */
export function useGraphqlMutation<
  T extends GraphqlMiddlewareMutationName,
  R extends GetMutationResult<T, GraphqlMiddlewareMutation>,
>(
  ...args:
    | GetMutationArgs<T, GraphqlMiddlewareMutation>
    | [MutationObjectArgs<T, GraphqlMiddlewareMutation>]
): Promise<GraphqlResponse<R>> {
  const [name, body, fetchOptions = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1]]
      : [args[0].name, args[0].variables, args[0].fetchOptions]

  return performRequest<R>('mutation', name, 'post', {
    body,
    ...fetchOptions,
  })
}
