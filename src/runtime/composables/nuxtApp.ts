import type { FetchOptions } from 'ofetch'
import { useGraphqlState } from './useGraphqlState'
import { type GraphqlResponse, getEndpoint } from './shared'
import { hash } from 'ohash'
import { GraphqlMiddlewareCache } from '../helpers/ClientCache'

type RequestCacheOptions = {
  client?: boolean
}

export function performRequest(
  operation: string,
  operationName: string,
  method: 'get' | 'post',
  options: FetchOptions,
  cacheOptions?: RequestCacheOptions,
): Promise<GraphqlResponse<any>> {
  const state = useGraphqlState()
  const app = useNuxtApp()

  // The cache key.
  const key = `${operation}:${operationName}:${hash(options.params)}`

  // Try to return a cached query if possible.
  if (cacheOptions) {
    const config = useAppConfig()
    // Handle caching on client.
    if (
      import.meta.client &&
      cacheOptions.client &&
      config.graphqlMiddleware.clientCacheEnabled
    ) {
      if (!app.$graphqlCache) {
        app.$graphqlCache = new GraphqlMiddlewareCache(
          config.graphqlMiddleware.clientCacheMaxSize,
        )
      }

      const cached = app.$graphqlCache.get<Promise<GraphqlResponse<any>>>(key)

      if (cached) {
        return cached
      }
    }
  }

  const promise = $fetch<GraphqlResponse<any>>(
    getEndpoint(operation, operationName),
    {
      ...(state && state.fetchOptions ? state.fetchOptions : {}),
      ...options,
      method,
    },
  ).then((v) => {
    return {
      data: v.data,
      errors: v.errors || [],
    }
  })

  if (import.meta.client && cacheOptions?.client && app.$graphqlCache) {
    app.$graphqlCache.set(key, promise)
  }

  return promise
}

declare module '#app' {
  interface NuxtApp {
    $graphqlCache?: GraphqlMiddlewareCache
  }
}
