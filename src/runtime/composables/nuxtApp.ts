import type { FetchOptions } from 'ofetch'
import { useGraphqlState } from './useGraphqlState'
import { hash } from 'ohash'
import { GraphqlMiddlewareCache } from '../helpers/ClientCache'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'
import { useNuxtApp, useAppConfig } from '#imports'
import type { RequestCacheOptions } from './../types'

export function performRequest<T>(
  operation: string,
  operationName: string,
  method: 'get' | 'post',
  options: FetchOptions,
  cacheOptions?: RequestCacheOptions,
): Promise<GraphqlResponse<T>> {
  const state = useGraphqlState()
  const app = useNuxtApp()

  if (!state) {
    console.error(
      `A GraphQL composable for ${operation} "${operationName}" was called before the "nuxt-graphql-middleware-provide-state" plugin could provide the state, which might lead to unexpected behaviour. Make sure that custom plugins that perform GraphQL requests are executed after "nuxt-graphql-middleware-provide-state" by setting it as a dependency via "dependsOn".`,
    )
  }

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

      const cached = app.$graphqlCache.get<Promise<GraphqlResponse<T>>>(key)

      if (cached) {
        if (import.meta.dev) {
          cached.then((response) => {
            if (response.errors.length) {
              app.callHook('nuxt-graphql-middleware:errors', {
                operation,
                operationName,
                errors: response.errors,
                stack: Error().stack,
              })
            }
          })
        }
        return cached
      }
    }
  }

  const promise = $fetch<GraphqlResponse<T>>(
    getEndpoint(operation, operationName),
    {
      ...(state && state.fetchOptions ? (state.fetchOptions as any) : {}),
      ...options,
      method,
    },
  ).then((v) => {
    if (import.meta.dev && v.errors?.length) {
      app.callHook('nuxt-graphql-middleware:errors', {
        operation,
        operationName,
        errors: v.errors,
        stack: Error().stack,
      })
    }
    return {
      ...v,
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
