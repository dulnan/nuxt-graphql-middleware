import type { FetchOptions } from 'ofetch'
import { GraphqlMiddlewareState } from './../../types'
import { buildRequestParams } from './../helpers'

import type {
  GraphqlMiddlewareQuery,
  GraphqlMiddlewareMutation,
} from '#build/nuxt-graphql-middleware'

// Possible query names.
type GraphqlMiddlewareQueryName = keyof GraphqlMiddlewareQuery
// Possible mutation names.
type GraphqlMiddlewareMutationName = keyof GraphqlMiddlewareMutation

// Determine the argument signature for the query method.
// Variables are either not required at all, required or optional.
type GetQueryArgs<
  T extends GraphqlMiddlewareQueryName,
  M extends GraphqlMiddlewareQuery,
> = M[T][0] extends null
  ? [T]
  : M[T][1] extends false
  ? [T, M[T][0]]
  : [T, M[T][0]?]

// Determine the argument signature for the mutation method.
type GetMutationArgs<
  T extends GraphqlMiddlewareMutationName,
  M extends GraphqlMiddlewareMutation,
> = M[T][0] extends null
  ? [T]
  : M[T][1] extends false
  ? [T, M[T][0]]
  : [T, M[T][0]?]

// Type for the query or mutation responses.
type GraphqlResponse<T> = {
  data: T
  errors: any[]
}

// Determine the query result.
type GetQueryResult<
  T extends GraphqlMiddlewareQueryName,
  M extends GraphqlMiddlewareQuery,
> = M[T] extends undefined ? undefined : GraphqlResponse<M[T][2]>

// Determine the query result.
type GetMutationResult<
  T extends GraphqlMiddlewareMutationName,
  M extends GraphqlMiddlewareMutation,
> = M[T] extends undefined ? undefined : GraphqlResponse<M[T][2]>

function getEndpoint(operation: string, operationName: string): string {
  const config = useRuntimeConfig()
  return `${config?.public?.['nuxt-graphql-middleware']?.serverApiPrefix}/${operation}/${operationName}`
}

export const useGraphqlState = function (): GraphqlMiddlewareState | null {
  try {
    const app = useNuxtApp()
    if (app.$graphqlState) {
      return app.$graphqlState as GraphqlMiddlewareState
    }
  } catch (_e) {}
  return null
}

type QueryObjectArgs<
  T extends GraphqlMiddlewareQueryName,
  M extends GraphqlMiddlewareQuery,
> = M[T][0] extends null
  ? {
      name: T
      fetchOptions?: FetchOptions
      variables?: null
    }
  : {
      name: T
      variables: M[T][0]
      fetchOptions?: FetchOptions
    }

type MutationObjectArgs<
  T extends GraphqlMiddlewareMutationName,
  M extends GraphqlMiddlewareMutation,
> = M[T][0] extends null
  ? {
      name: T
      variables?: null
      fetchOptions?: FetchOptions
    }
  : {
      name: T
      variables: M[T][0]
      fetchOptions?: FetchOptions
    }

function performRequest(
  operation: string,
  operationName: string,
  method: 'get' | 'post',
  options: FetchOptions,
) {
  const state = useGraphqlState()
  return $fetch<GraphqlResponse<any>>(getEndpoint(operation, operationName), {
    ...(state && state.fetchOptions ? state.fetchOptions : {}),
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
