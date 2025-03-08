import type { FetchOptions } from 'ofetch'
import type { RequestCacheOptions } from './../types'
import { CLIENT_CONTEXT_PREFIX } from '../settings'
import type { GraphqlClientContext } from '#nuxt-graphql-middleware/client-options'
import type { Query, Mutation } from '#nuxt-graphql-middleware/operations'

export type GraphqlComposableOptions = {
  fetchOptions?: FetchOptions
  graphqlCaching?: RequestCacheOptions
  clientContext?: Partial<GraphqlClientContext>
}

// Determine the argument signature for the query method.
// Variables are either not required at all, required or optional.
export type GetQueryArgs<
  K extends keyof Query,
  Q extends Query[K] = Query[K],
> = Q['variables'] extends null
  ? [K, (null | undefined)?, GraphqlComposableOptions?]
  : Q['needsVariables'] extends true
    ? [K, Q['variables'], GraphqlComposableOptions?]
    : [K, (Q['variables'] | null)?, GraphqlComposableOptions?]

// Determine the argument signature for the mutation method.
export type GetMutationArgs<
  K extends keyof Mutation,
  M extends Mutation[K] = Mutation[K],
> = M['needsVariables'] extends true
  ? [K, M['variables'], GraphqlComposableOptions?]
  : [K, (M['variables'] | null)?, GraphqlComposableOptions?]

// Determine the query result.
export type GetQueryResult<
  K extends keyof Query,
  Q extends Query[K] = Query[K],
> = Q['response']

// Determine the query result.
export type GetMutationResult<
  K extends keyof Mutation,
  M extends Mutation[K] = Mutation[K],
> = M['response']

export type QueryObjectArgs<
  K extends keyof Query,
  Q extends Query[K] = Query[K],
> = Q['needsVariables'] extends true
  ? {
      name: K
      fetchOptions?: FetchOptions
      graphqlCaching?: RequestCacheOptions
      clientContext?: Partial<GraphqlClientContext>
      variables: Q['variables']
    }
  : {
      name: K
      variables?: Q['variables'] | null
      fetchOptions?: FetchOptions
      graphqlCaching?: RequestCacheOptions
      clientContext?: Partial<GraphqlClientContext>
    }

export type MutationObjectArgs<
  K extends keyof Mutation,
  M extends Mutation[K] = Mutation[K],
> = M['needsVariables'] extends true
  ? {
      name: K
      variables: M['variables']
      fetchOptions?: FetchOptions
      clientContext?: Partial<GraphqlClientContext>
    }
  : {
      name: K
      variables?: M['variables'] | null
      fetchOptions?: FetchOptions
      clientContext?: Partial<GraphqlClientContext>
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

export function encodeContext(
  context: Record<string, string | null | undefined>,
) {
  return Object.entries(context).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[CLIENT_CONTEXT_PREFIX + key] = value
      }
      return acc
    },
    {},
  )
}
