import type { FetchOptions } from 'ofetch'
import { useGraphqlState } from './useGraphqlState'
import { hash } from 'ohash'
import { GraphqlMiddlewareCache } from '../helpers/ClientCache'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'
import { useNuxtApp, useAppConfig } from '#imports'
import { operationHashes } from '#nuxt-graphql-middleware/operation-hashes'
import type { RequestCacheOptions } from './../types'
import { encodeVariables } from '../helpers/queryEncoding'
import { encodeContext } from '../helpers/composables'
import { OPERATION_HASH_PREFIX } from '../settings'

export function performRequest<T>(
  /**
   * The operation type.
   */
  operation: 'query' | 'mutation',

  /**
   * The name of the operation.
   */
  operationName: string,

  /**
   * The operation variables.
   */
  variablesOrBody: Record<string, any>,

  /**
   * Fetch options set on the composable.
   */
  overrideFetchOptions: FetchOptions,

  /**
   * The global client options determined in the composable.
   */
  globalClientContext: Record<string, any>,

  /**
   * Client options overrides set on the composable.
   */
  overrideClientContext: Record<string, any>,

  /**
   * The cache options set on the composable.
   */
  cacheOptions: RequestCacheOptions,
): Promise<GraphqlResponse<T>> {
  const state = useGraphqlState()
  const app = useNuxtApp()
  const config = useAppConfig()
  const method: 'get' | 'post' = operation === 'query' ? 'get' : 'post'

  if (!state) {
    console.error(
      `A GraphQL composable for ${operation} "${operationName}" was called before the "nuxt-graphql-middleware-provide-state" plugin could provide the state, which might lead to unexpected behaviour. Make sure that custom plugins that perform GraphQL requests are executed after "nuxt-graphql-middleware-provide-state" by setting it as a dependency via "dependsOn".`,
    )
  }

  const clientContext = Object.assign(
    {},
    globalClientContext,
    overrideClientContext,
  )

  // Merge all fetch options.
  const fetchOptions = Object.assign(
    {},
    state?.fetchOptions,
    overrideFetchOptions,
  )

  // Merge all query params.
  const params = Object.assign(
    {
      // The unique operation hash that changes whenever any operation source or
      // fragment changes.
      [OPERATION_HASH_PREFIX]: operationHashes[operationName],
    },
    encodeContext(clientContext),
    fetchOptions.params,
    fetchOptions.query,
    operation === 'query' ? encodeVariables(variablesOrBody) : null,
  )

  // The cache key that includes the variables, client context and
  // operation hash.
  // We only need to build the cache key if actually needed.
  const cacheKey =
    import.meta.client &&
    cacheOptions?.client &&
    config.graphqlMiddleware.clientCacheEnabled
      ? `${operation}:${operationName}:${hash(params)}`
      : undefined

  // Try to return a cached query if possible.
  if (import.meta.client && cacheKey) {
    // Handle caching on client.
    if (!app.$graphqlCache) {
      app.$graphqlCache = new GraphqlMiddlewareCache(
        config.graphqlMiddleware.clientCacheMaxSize,
      )
    }

    const cached = app.$graphqlCache.get<Promise<GraphqlResponse<T>>>(cacheKey)

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

  const promise = $fetch<GraphqlResponse<T>>(
    getEndpoint(operation, operationName),
    Object.assign(
      {},
      // Use the merged fetch options.
      fetchOptions,
      // Remove params and query from the fetch options.
      {
        params: undefined,
        query: undefined,
      },
      // Set the previously merged params. That way we only ever pass "params"
      // as the query params.
      {
        params,
        method,
        body: operation === 'mutation' ? variablesOrBody : undefined,
      },
    ),
  ).then((v) => {
    if (import.meta.dev && v.errors?.length) {
      app.callHook('nuxt-graphql-middleware:errors', {
        operation,
        operationName,
        errors: v.errors,
        stack: Error().stack,
      })
    }

    // Make sure we get at least "data" and "errors" properties in the end.
    return Object.assign({}, v, {
      data: v?.data,
      errors: v?.errors || [],
    })
  })

  if (import.meta.client && cacheKey && app.$graphqlCache) {
    app.$graphqlCache.set(cacheKey, promise)
  }

  return promise
}

declare module '#app' {
  interface NuxtApp {
    $graphqlCache?: GraphqlMiddlewareCache
  }
}
