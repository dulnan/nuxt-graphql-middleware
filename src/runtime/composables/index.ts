import { GraphqlMiddlewareState } from './../../types'
import { buildRequestParams } from './../helpers'
import { useRuntimeConfig } from '#imports'
import type {
  GraphqlMiddlewareQuery,
  GraphqlMiddlewareMutation,
} from '#build/nuxt-graphql-middleware'

type GraphqlMiddlewareQueryName = keyof GraphqlMiddlewareQuery
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

type GetMutationArgs<
  T extends GraphqlMiddlewareMutationName,
  M extends GraphqlMiddlewareMutation,
> = M[T][0] extends null
  ? [T]
  : M[T][1] extends false
  ? [T, M[T][0]]
  : [T, M[T][0]?]

type GraphqlResponse<T> = {
  data: T
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

const state: GraphqlMiddlewareState = {
  fetchOptions: {},
}

export const useGraphqlState = (): GraphqlMiddlewareState => {
  return state
}

export function useGraphqlQuery<T extends GraphqlMiddlewareQueryName>(
  ...args: GetQueryArgs<T, GraphqlMiddlewareQuery>
): Promise<GetQueryResult<T, GraphqlMiddlewareQuery>> {
  const name = args[0]
  if (typeof name !== 'string') {
    return Promise.reject(new Error('Invalid query name'))
  }
  const state = useGraphqlState()
  return $fetch(getEndpoint('query', name), {
    params: buildRequestParams(args[1]),
    // @todo: Remove any once https://github.com/unjs/nitro/pull/883 is released.
    ...(state.fetchOptions as any),
  }) as Promise<GetQueryResult<T, GraphqlMiddlewareQuery>>
}

export function useGraphqlMutation<T extends GraphqlMiddlewareMutationName>(
  ...args: GetMutationArgs<T, GraphqlMiddlewareMutation>
): Promise<GetMutationResult<T, GraphqlMiddlewareMutation>> {
  const state = useGraphqlState()
  const name = args[0]
  const body = args[1] || {}
  if (typeof name !== 'string') {
    return Promise.reject(new Error('Invalid mutation name'))
  }
  return $fetch(getEndpoint('mutation', name), {
    // @todo: Remove any once https://github.com/unjs/nitro/pull/883 is released.
    method: 'post' as any,
    body,
    ...state.fetchOptions,
  }) as Promise<GetMutationResult<T, GraphqlMiddlewareMutation>>
}
