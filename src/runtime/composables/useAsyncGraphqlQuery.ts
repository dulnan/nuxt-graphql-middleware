import {
  type GraphqlMiddlewareQueryName,
  type KeysOf,
  type PickFrom,
} from './shared'
import type { FetchOptions } from 'ofetch'
import { type Ref, isRef, unref } from 'vue'
import { buildRequestParams } from './../helpers'
import { performRequest } from './nuxtApp'
import type { GraphqlMiddlewareQuery } from '#build/nuxt-graphql-middleware'
import type { AsyncData, AsyncDataOptions } from 'nuxt/app'
import { useAsyncData, useAppConfig } from '#imports'
import { hash } from 'ohash'
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import type { GraphqlResponseError } from '#graphql-middleware/types'

type AsyncGraphqlQueryOptions<
  ResponseType,
  DefaultT,
  Keys extends KeysOf<DefaultT>,
  F,
> = AsyncDataOptions<ResponseType, DefaultT, Keys> & {
  graphqlCaching?: {
    client?: boolean
  }
  fetchOptions?: F
}

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
  ResponseType extends GraphqlResponse<GraphqlMiddlewareQuery[Name][2]>,
  // Type for the $fetch options.
  F extends FetchOptions<'json'>,
  // The type for the transformed/picked/defaulted response of useAsyncData.
  DefaultT = ResponseType,
  // Possible keys for the "pick" option.
  Keys extends KeysOf<DefaultT> = KeysOf<DefaultT>,
>(
  name: Name,
  // Arguments are optional, so the method signature makes it optional.
  ...args: VarsOptional extends true
    ? [
        (undefined | null | {} | VarType | Ref<VarType>)?,
        AsyncGraphqlQueryOptions<ResponseType, DefaultT, Keys, F>?,
      ]
    : [
        VarType | Ref<VarType>,
        (
          | undefined
          | null
          | AsyncGraphqlQueryOptions<ResponseType, DefaultT, Keys, F>
        )?,
      ]
): AsyncData<PickFrom<DefaultT, Keys>, GraphqlResponseError[] | null> {
  const variables = args[0]
  const asyncDataOptions = args[1] || {}
  const fetchOptions = asyncDataOptions.fetchOptions
  const key = `graphql:${name}:${hash(unref(variables))}`

  const config = useAppConfig()
  const app = useNuxtApp()

  // If the variables are reactive, watch them.
  if (variables && isRef(variables)) {
    if (!asyncDataOptions.watch) {
      asyncDataOptions.watch = []
    }

    asyncDataOptions.watch.push(variables)
  }

  // On the client side, if client caching is requested, we can directly return
  // data from the payload if possible.
  if (
    import.meta.client &&
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

  return useAsyncData(
    key,
    () =>
      performRequest(
        'query',
        name,
        'get',
        {
          params: buildRequestParams(unref(variables)),
          ...fetchOptions,
        },
        asyncDataOptions.graphqlCaching,
      ) as any,
    asyncDataOptions,
  ) as any
}
