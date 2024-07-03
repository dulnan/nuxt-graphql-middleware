import type { FetchOptions } from 'ofetch'
import { useRuntimeConfig } from '#imports'
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import type {
  GraphqlMiddlewareQuery,
  GraphqlMiddlewareMutation,
} from '#build/nuxt-graphql-middleware'
import type { RequestCacheOptions } from '#graphql-middleware/types'

// Possible query names.
export type GraphqlMiddlewareQueryName = keyof GraphqlMiddlewareQuery
// Possible mutation names.
export type GraphqlMiddlewareMutationName = keyof GraphqlMiddlewareMutation

export type GraphqlComposableOptions = {
  fetchOptions?: FetchOptions
  graphqlCaching?: RequestCacheOptions
}

// Determine the argument signature for the query method.
// Variables are either not required at all, required or optional.
export type GetQueryArgs<
  T extends GraphqlMiddlewareQueryName,
  M extends GraphqlMiddlewareQuery,
> = M[T][0] extends null
  ? [T, (null | undefined)?, GraphqlComposableOptions?]
  : M[T][1] extends false
    ? [T, M[T][0], GraphqlComposableOptions?]
    : [T, M[T][0]?, GraphqlComposableOptions?]

// Determine the argument signature for the mutation method.
export type GetMutationArgs<
  T extends GraphqlMiddlewareMutationName,
  M extends GraphqlMiddlewareMutation,
> = M[T][0] extends null
  ? [T, (null | undefined)?, GraphqlComposableOptions?]
  : M[T][1] extends false
    ? [T, M[T][0], GraphqlComposableOptions?]
    : [T, M[T][0]?, GraphqlComposableOptions?]

// Determine the query result.
export type GetQueryResult<
  T extends GraphqlMiddlewareQueryName,
  M extends GraphqlMiddlewareQuery,
> = M[T] extends undefined ? undefined : GraphqlResponse<M[T][2]>

// Determine the query result.
export type GetMutationResult<
  T extends GraphqlMiddlewareMutationName,
  M extends GraphqlMiddlewareMutation,
> = M[T] extends undefined ? undefined : GraphqlResponse<M[T][2]>

export function getEndpoint(operation: string, operationName: string): string {
  const config = useRuntimeConfig()
  return `${config?.public?.['nuxt-graphql-middleware']?.serverApiPrefix}/${operation}/${operationName}`
}

export type QueryObjectArgs<
  T extends GraphqlMiddlewareQueryName,
  M extends GraphqlMiddlewareQuery,
> = M[T][0] extends null
  ? {
      name: T
      fetchOptions?: FetchOptions
      graphqlCaching?: RequestCacheOptions
      variables?: null
    }
  : {
      name: T
      variables: M[T][0]
      fetchOptions?: FetchOptions
      graphqlCaching?: RequestCacheOptions
    }

export type MutationObjectArgs<
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

export type PickFrom<T, K extends Array<string>> =
  T extends Array<any>
    ? T
    : T extends Record<string, any>
      ? keyof T extends K[number]
        ? T
        : K[number] extends never
          ? T
          : Pick<T, K[number]>
      : T

export type KeysOf<T> = Array<
  T extends T ? (keyof T extends string ? keyof T : never) : never
>
