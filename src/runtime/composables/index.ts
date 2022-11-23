import { GraphqlMiddlewareState } from './../../types'
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

  const variables: Record<string, any> = args[1] as any
  let params: Record<string, any> = {}

  // Determine if the variables can safely be passed as query params.
  const queryFallback =
    variables &&
    Object.keys(variables).some((key) => {
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
    ...state.fetchOptions,
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
    method: 'post',
    body,
    ...state.fetchOptions,
  }) as Promise<GetMutationResult<T, GraphqlMiddlewareMutation>>
}
