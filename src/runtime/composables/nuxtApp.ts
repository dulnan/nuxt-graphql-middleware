import type { FetchOptions } from 'ofetch'
import type { NuxtApp } from '#app'
import { useGraphqlState } from './useGraphqlState'
import { hash } from 'ohash'
import type { GraphqlMiddlewareCache } from '../helpers/ClientCache'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'
import { useNuxtApp, useAppConfig } from '#imports'
import { operationHashes } from '#nuxt-graphql-middleware/operation-hashes'
import {
  clientCacheEnabledAtBuild,
  importMetaClient,
  importMetaServer,
} from '#nuxt-graphql-middleware/config'
import type { RequestCacheOptions } from './../types'
import { encodeVariables, sortQueryParams } from '../helpers/queryEncoding'
import { encodeContext, getOrCreateClientCache } from '../helpers/composables'
import { OPERATION_HASH_PREFIX, SSR_ABORT_SIGNAL_KEY } from '../settings'
import { getConnectionAbortSignal } from '../helpers/abort'

/**
 * The responses of cached requests, by the promise in the client cache.
 */
const cachedResponses = new WeakMap<
  Promise<GraphqlResponse<any>>,
  GraphqlResponse<any>
>()

/**
 * Get the response of a request in the client cache, once it is loaded.
 */
export function getCachedResponse<T>(
  promise: Promise<GraphqlResponse<T>>,
): GraphqlResponse<T> | undefined {
  return cachedResponses.get(promise)
}

/**
 * Build the fetch options and the query params of a request.
 */
export function getRequestParams(
  app: NuxtApp,
  operation: 'query' | 'mutation',
  operationName: string,
  variablesOrBody: Record<string, any>,
  overrideFetchOptions: FetchOptions,
  globalClientContext: Record<string, any>,
  overrideClientContext: Record<string, any>,
  /**
   * Build the params of a request from the browser. On the server, this
   * builds the request key that the browser would use.
   */
  client: boolean = importMetaClient,
) {
  const state = useGraphqlState(app)
  const isQuery = operation === 'query'

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
  const paramsRaw = Object.assign(
    client
      ? {
          // The unique operation hash that changes whenever any operation source or
          // fragment changes.
          [OPERATION_HASH_PREFIX]: operationHashes[operationName],
        }
      : {},
    encodeContext(clientContext),
    fetchOptions.params,
    fetchOptions.query,
    isQuery ? encodeVariables(variablesOrBody) : null,
  )

  // When doing a query on the client, we want the query params to be sorted
  // alphabetically, so that it's possible to consistently cache the exact same
  // query in both our client cache or on a CDN cache.
  const params = client && isQuery ? sortQueryParams(paramsRaw) : paramsRaw

  return { fetchOptions, params }
}

/**
 * The key of a request in the client cache. It includes the variables, the
 * client context and the operation hash.
 */
export function getRequestCacheKey(
  operation: 'query' | 'mutation',
  operationName: string,
  params: Record<string, any>,
): string {
  return `${operation}:${operationName}:${hash(params)}`
}

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

  /**
   * The async data key.
   */
  asyncDataKey?: string,

  /**
   * The signal to abort the request, for example from useAsyncData.
   */
  signal?: AbortSignal,
): Promise<GraphqlResponse<T>> {
  const state = useGraphqlState()
  const app = useNuxtApp()
  const config = useAppConfig()
  const method: 'get' | 'post' = operation === 'query' ? 'get' : 'post'
  const isQuery = operation === 'query'

  if (!state) {
    console.error(
      `A GraphQL composable for ${operation} "${operationName}" was called before the "nuxt-graphql-middleware-provide-state" plugin could provide the state, which might lead to unexpected behaviour. Make sure that custom plugins that perform GraphQL requests are executed after "nuxt-graphql-middleware-provide-state" by setting it as a dependency via "dependsOn".`,
    )
  }

  const { fetchOptions, params } = getRequestParams(
    app,
    operation,
    operationName,
    variablesOrBody,
    overrideFetchOptions,
    globalClientContext,
    overrideClientContext,
  )

  // We only need to build the cache key if actually needed.
  const cacheKey =
    importMetaClient &&
    clientCacheEnabledAtBuild &&
    isQuery &&
    cacheOptions?.client &&
    config.graphqlMiddleware.clientCacheEnabled
      ? getRequestCacheKey(operation, operationName, params)
      : undefined

  // Try to return a cached query if possible.
  if (importMetaClient && cacheKey) {
    const cache = getOrCreateClientCache(app, config)
    if (cache) {
      const cached = cache.get<Promise<GraphqlResponse<T>>>(cacheKey)

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

  const ssrAbortSignal =
    importMetaServer && isQuery
      ? getConnectionAbortSignal(app.ssrContext?.event)
      : undefined

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
      // Cached requests can be shared by several callers, so they are not
      // aborted if one of them doesn't need the result anymore.
      signal && !cacheKey && !fetchOptions.signal ? { signal } : {},
      // During SSR, pass a signal for the connection of the page to the server
      // route, so that it can abort the query if the client closes the
      // connection. The context is not part of the types of ofetch, but
      // Nitro's local fetch passes it on, so a context from the fetch options
      // is kept.
      ssrAbortSignal
        ? {
            context: {
              ...(fetchOptions as { context?: Record<string, unknown> })
                .context,
              [SSR_ABORT_SIGNAL_KEY]: ssrAbortSignal,
            },
          }
        : {},
    ),
  ).then((v) => {
    if (import.meta.dev && v?.errors?.length) {
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

  if (
    importMetaClient &&
    cacheKey &&
    app.$graphqlCache &&
    clientCacheEnabledAtBuild
  ) {
    const cache = app.$graphqlCache
    cache.set(cacheKey, promise, asyncDataKey)

    promise.then(
      (response) => {
        // So that useAsyncGraphqlQuery can return the response right away.
        cachedResponses.set(promise, response)
      },
      () => {
        // Failed requests are removed, so that they are performed again the
        // next time instead of returning the error.
        if (cache.cache[cacheKey] === promise) {
          cache.remove(cacheKey)
        }
      },
    )
  }

  return promise
}

declare module '#app' {
  interface NuxtApp {
    $graphqlCache?: GraphqlMiddlewareCache
  }
}
