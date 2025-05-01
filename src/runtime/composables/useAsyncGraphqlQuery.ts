import type { KeysOf, PickFrom } from './../helpers/composables'
import type { FetchOptions } from 'ofetch'
import { type Ref, isRef, unref } from 'vue'
import { performRequest } from './nuxtApp'
import {
  clientOptions,
  type GraphqlClientContext,
} from '#nuxt-graphql-middleware/client-options'
import { useAsyncData, useAppConfig, useNuxtApp } from '#imports'
import { hash } from 'ohash'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import type { RequestCacheOptions } from './../types'
import type { AsyncData, AsyncDataOptions, NuxtError } from '#app'
import type { DefaultAsyncDataValue } from 'nuxt/app/defaults'
import type { Query } from '#nuxt-graphql-middleware/operation-types'

type AsyncGraphqlQueryOptions<
  FetchOptions,
  ResT,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = DefaultAsyncDataValue,
> = AsyncDataOptions<ResT, DataT, PickKeys, DefaultT> & {
  /**
   * Control how the GraphQL response can be cached.
   */
  graphqlCaching?: RequestCacheOptions

  /**
   * Options for the fetch call to the GraphQL middleware endpoint.
   */
  fetchOptions?: FetchOptions

  /**
   * Additional client context.
   *
   * These values override the values defined globally in defineGraphqlClientOptions().
   */
  clientContext?: Partial<GraphqlClientContext>
}

export function useAsyncGraphqlQuery<
  Name extends keyof Query,
  Operation extends Query[Name] = Query[Name],
  ResT extends GraphqlResponse<Operation['response']> = GraphqlResponse<
    Operation['response']
  >,
  FetchO extends FetchOptions<'json'> = FetchOptions<'json'>,
  VarType extends Operation['variables'] = Operation['variables'],
  NuxtErrorDataT = unknown,
  DataT = ResT,
  DefaultT = undefined,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
>(
  name: Name,
  ...args: Operation['needsVariables'] extends false
    ? [
        (undefined | null | Record<string, never> | VarType | Ref<VarType>)?,
        AsyncGraphqlQueryOptions<FetchO, ResT, DataT, PickKeys, DefaultT>?,
      ]
    : [
        VarType | Ref<VarType>,
        (
          | undefined
          | null
          | AsyncGraphqlQueryOptions<FetchO, ResT, DataT, PickKeys, DefaultT>
        )?,
      ]
): AsyncData<
  PickFrom<DataT, PickKeys> | DefaultT,
  | (NuxtErrorDataT extends Error | NuxtError
      ? NuxtErrorDataT
      : NuxtError<NuxtErrorDataT>)
  | undefined
>

export function useAsyncGraphqlQuery<
  Name extends keyof Query,
  Operation extends Query[Name] = Query[Name],
  ResT extends GraphqlResponse<Operation['response']> = GraphqlResponse<
    Operation['response']
  >,
  FetchO extends FetchOptions<'json'> = FetchOptions<'json'>,
  VarType extends Operation['variables'] = Operation['variables'],
  NuxtErrorDataT = unknown,
  DataT = ResT,
  DefaultT = DataT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
>(
  name: Name,
  ...args: Operation['needsVariables'] extends false
    ? [
        (undefined | null | Record<string, never> | VarType | Ref<VarType>)?,
        AsyncGraphqlQueryOptions<FetchO, ResT, DataT, PickKeys, DefaultT>?,
      ]
    : [
        VarType | Ref<VarType>,
        (
          | undefined
          | null
          | AsyncGraphqlQueryOptions<FetchO, ResT, DataT, PickKeys, DefaultT>
        )?,
      ]
): AsyncData<
  PickFrom<DataT, PickKeys> | DefaultT,
  | (NuxtErrorDataT extends Error | NuxtError
      ? NuxtErrorDataT
      : NuxtError<NuxtErrorDataT>)
  | undefined
>

/**
 * Wrapper for useAsyncData to perform a single GraphQL query.
 */
export function useAsyncGraphqlQuery<
  // The name of the query.
  Name extends keyof Query,
  // The type for the variables.
  Operation extends Query[Name] = Query[Name],
  // The type for the query response.
  ResT extends GraphqlResponse<Operation['response']> = GraphqlResponse<
    Operation['response']
  >,
  // Type for the $fetch options.
  FetchO extends FetchOptions<'json'> = FetchOptions<'json'>,
  // The variable type.
  VarType extends Operation['variables'] = Operation['variables'],
  // The error type.
  NuxtErrorDataT = unknown,
  // The transformed data.
  DataT = ResT,
  // The type for the defaulted response of useAsyncData.
  DefaultT = undefined,
  // Possible keys for the "pick" option.
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
>(
  name: Name,
  // Arguments are optional, so the method signature makes it optional.
  ...args: Operation['needsVariables'] extends false
    ? [
        (undefined | null | Record<string, never> | VarType | Ref<VarType>)?,
        AsyncGraphqlQueryOptions<FetchO, ResT, DataT, PickKeys, DefaultT>?,
      ]
    : [
        VarType | Ref<VarType>,
        (
          | undefined
          | null
          | AsyncGraphqlQueryOptions<FetchO, ResT, DataT, PickKeys, DefaultT>
        )?,
      ]
): AsyncData<
  PickFrom<DataT, PickKeys> | DefaultT,
  | (NuxtErrorDataT extends Error | NuxtError
      ? NuxtErrorDataT
      : NuxtError<NuxtErrorDataT>)
  | undefined
> {
  const variables = args[0]
  const asyncDataOptions = args[1] || {}
  const key = `graphql:${name}:${hash(unref(variables as any))}`

  const config = useAppConfig()
  const app = useNuxtApp()

  if (import.meta.client) {
    // If the variables are reactive, watch them cient side.
    if (variables && isRef(variables)) {
      if (!asyncDataOptions.watch) {
        asyncDataOptions.watch = []
      }

      asyncDataOptions.watch.push(variables)
    }

    // On the client side, if client caching is requested, we can directly return
    // data from the payload if possible.
    if (
      asyncDataOptions.graphqlCaching?.client &&
      !asyncDataOptions.getCachedData
    ) {
      asyncDataOptions.getCachedData = function (key) {
        // When the app is not hydrating and the client cache is disabled, return.
        // This is identical to the default behaviour of useAsyncData, where the
        // payload data is only used during hydration.
        if (!app.isHydrating && !config.graphqlMiddleware.clientCacheEnabled) {
          return
        }

        // Try to return data from payload.
        return app.payload.data[key]
      }
    }
  }

  const result = useAsyncData<any, any, DataT, PickKeys, DefaultT>(
    key,
    () => {
      const globalClientContext = clientOptions.buildClientContext
        ? clientOptions.buildClientContext()
        : {}

      return performRequest<any>(
        'query',
        name,
        unref(variables as any) || {},
        (asyncDataOptions.fetchOptions || {}) as Record<string, any>,
        globalClientContext,
        asyncDataOptions.clientContext || {},
        asyncDataOptions.graphqlCaching || {},
      )
    },
    asyncDataOptions as any,
  )

  if (import.meta.hot) {
    import.meta.hot.on('nuxt-graphql-middleware:reload', (data) => {
      if (data.operations.includes(name)) {
        result.refresh()
      }
    })
  }

  return result
}
