import type { Ref } from 'vue'
import { GraphqlMiddlewareState } from './../../types'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import type {
  GraphqlMiddlewareQuery,
  GraphqlMiddlewareMutation,
} from '#build/nuxt-graphql-middleware'

type GraphqlMiddlewareQueryName = keyof GraphqlMiddlewareQuery
type GraphqlMiddlewareMutationName = keyof GraphqlMiddlewareMutation

type GraphqlMiddlewareOperationMap =
  | GraphqlMiddlewareQuery
  | GraphqlMiddlewareMutation

// Determine the argument signature for the query method.
// Variables are either not required at all, required or optional.
type GetArgs<
  T extends GraphqlMiddlewareQueryName,
  M extends GraphqlMiddlewareOperationMap,
> = M[T][0] extends null
  ? [T]
  : M[T][1] extends false
  ? [T, M[T][0]]
  : [T, M[T][0]?]

type GraphqlResponse<T> = {
  data: T
}

// Determine the query result.
type GetResult<T, M> = M[T] extends undefined
  ? undefined
  : GraphqlResponse<M[T][2]>

function getEndpoint(operation: string, operationName: string): string {
  const config = useRuntimeConfig()
  return `${config?.public?.['nuxt-graphql-middleware']?.serverApiPrefix}/${operation}/${operationName}`
}

export const useGraphqlState = (): Ref<GraphqlMiddlewareState> => {
  const nuxtApp = useNuxtApp() as Partial<{
    _graphql_middleware: Ref<GraphqlMiddlewareState>
  }>

  return nuxtApp?._graphql_middleware
}

export function useGraphqlQuery<T extends GraphqlMiddlewareQueryName>(
  ...args: GetArgs<T, GraphqlMiddlewareQuery>
): Promise<GetResult<T, GraphqlMiddlewareQuery>> {
  const name = args[0]
  if (typeof name !== 'string') {
    return Promise.reject(new Error('Invalid query name'))
  }

  const variables = args[1] || {}
  let params: Record<string, any> = {}

  // Determine if the variables can safely be passed as query params.
  const queryFallback = Object.keys(variables).some((key) => {
    const valueType = typeof variables[key]
    return valueType === 'function' || valueType === 'object'
  })

  // Variables contain unsafe query param values. Variables object is sent as a single param with object JSON stringified.
  if (queryFallback) {
    params.__variables = JSON.stringify(variables)
  } else {
    params = variables
  }

  const state = useGraphqlState()
  return $fetch(getEndpoint('query', name), {
    params,
    ...state.value.fetchOptions,
  }) as Promise<GetResult<T, GraphqlMiddlewareQuery>>
}

export function useGraphqlMutation<T extends GraphqlMiddlewareMutationName>(
  ...args: GetArgs<T, GraphqlMiddlewareMutation>
): Promise<GetResult<T, GraphqlMiddlewareMutation>> {
  const state = useGraphqlState()
  const name = args[0]
  const body = args[1] || {}
  if (typeof name !== 'string') {
    return Promise.reject(new Error('Invalid mutation name'))
  }
  return $fetch(getEndpoint('mutation', name), {
    method: 'post',
    body,
    ...state.value.fetchOptions,
  }) as Promise<GetResult<T, GraphqlMiddlewareMutation>>
}
