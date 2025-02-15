import {
  type GraphqlMiddlewareQueryName,
  type KeysOf,
  type PickFrom,
  encodeContext,
} from './../helpers/composables'
import type { FetchOptions } from 'ofetch'
import { type Ref, isRef, unref } from 'vue'
import { buildRequestParams } from './../helpers'
import { performRequest } from './nuxtApp'
import {
  clientOptions,
  type GraphqlClientContext,
} from '#graphql-middleware-client-options'
import type { GraphqlMiddlewareQuery } from '#nuxt-graphql-middleware/generated-types'
import { useAsyncData, useAppConfig, useNuxtApp } from '#imports'
import { hash } from 'ohash'
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import type { RequestCacheOptions } from '#graphql-middleware/types'
import type { AsyncData, AsyncDataOptions, NuxtError } from '#app'
import type { DefaultAsyncDataValue } from 'nuxt/app/defaults'

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
  Name extends GraphqlMiddlewareQueryName,
  VarType extends GraphqlMiddlewareQuery[Name][0],
  VarsOptional extends GraphqlMiddlewareQuery[Name][1],
  ResT extends GraphqlResponse<GraphqlMiddlewareQuery[Name][2]>,
  FetchO extends FetchOptions<'json'>,
  NuxtErrorDataT = unknown,
  DataT = ResT,
  DefaultT = undefined,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
>(
  name: Name,
  ...args: VarsOptional extends true
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
  Name extends GraphqlMiddlewareQueryName,
  VarType extends GraphqlMiddlewareQuery[Name][0],
  VarsOptional extends GraphqlMiddlewareQuery[Name][1],
  ResT extends GraphqlResponse<GraphqlMiddlewareQuery[Name][2]>,
  FetchO extends FetchOptions<'json'>,
  NuxtErrorDataT = unknown,
  DataT = ResT,
  DefaultT = DataT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
>(
  name: Name,
  ...args: VarsOptional extends true
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
  Name extends GraphqlMiddlewareQueryName,
  // The type for the variables.
  VarType extends GraphqlMiddlewareQuery[Name][0],
  // Whether the variables argument is optional or not.
  VarsOptional extends GraphqlMiddlewareQuery[Name][1],
  // The type for the query response.
  ResT extends GraphqlResponse<GraphqlMiddlewareQuery[Name][2]>,
  // Type for the $fetch options.
  FetchO extends FetchOptions<'json'>,
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
  ...args: VarsOptional extends true
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
  const fetchOptions = asyncDataOptions.fetchOptions
  const key = `graphql:${name}:${hash(unref(variables))}`

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

  return useAsyncData<any, any, DataT, PickKeys, DefaultT>(
    key,
    () => {
      const globalClientContext = clientOptions.buildClientContext
        ? clientOptions.buildClientContext()
        : {}

      return performRequest<any>(
        'query',
        name,
        'get',
        {
          ...(fetchOptions as any),
          params: {
            ...(fetchOptions?.params || {}),
            ...buildRequestParams(unref(variables)),
            ...encodeContext({
              ...globalClientContext,
              ...(asyncDataOptions.clientContext || {}),
            }),
          },
        },
        asyncDataOptions.graphqlCaching,
      )
    },
    asyncDataOptions as any,
  )
}
