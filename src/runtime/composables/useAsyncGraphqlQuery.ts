import {
  getOrCreateClientCache,
  type KeysOf,
  type PickFrom,
} from './../helpers/composables'
import type { FetchOptions } from 'ofetch'
import { type Ref, isRef, unref } from 'vue'
import {
  getCachedResponse,
  getRequestCacheKey,
  getRequestParams,
  performRequest,
} from './nuxtApp'
import {
  clientOptions,
  type GraphqlClientContext,
} from '#nuxt-graphql-middleware/client-options'
import {
  useAsyncData,
  useAppConfig,
  useNuxtApp,
  useState,
  computed,
} from '#imports'
import { hash } from 'ohash'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import type { RequestCacheOptions } from './../types'
import type { AsyncData, AsyncDataOptions, NuxtApp, NuxtError } from '#app'
import type { Query } from '#nuxt-graphql-middleware/operation-types'
import {
  clientCacheEnabledAtBuild,
  importMetaClient,
  importMetaServer,
} from '#nuxt-graphql-middleware/config'

/**
 * The state with the request of each response in the payload, and the call
 * that made it, by async data key. The server records it, so that the browser
 * caches a response from the payload for that request and call.
 */
const REQUEST_KEYS_STATE = 'nuxt-graphql-middleware:request-keys'

/**
 * The request of a response in the payload, and the call that made it.
 */
type ServerRequest = {
  request: string

  /**
   * The key of the call site that Nuxt's compiler adds, if any.
   */
  site?: string
}

/**
 * Matches the source of native and bound functions, like Nuxt does.
 */
const NATIVE_CODE_RE = /\{\s*\[native code\]\s*\}/

/**
 * Identify the transform and pick of a call by their source, like Nuxt's check
 * for incompatible options. In minified code, different functions can have the
 * same source, so the call site is part of the key too.
 */
function getTransformSignature(
  transform?: (input: any) => unknown,
  pick?: string[],
): string {
  let source = ''
  if (transform) {
    source = Function.prototype.toString.call(transform)
    if (NATIVE_CODE_RE.test(source)) {
      source = `${transform.name}(${transform.length})[native]`
    }
  }
  return hash([source, pick || []])
}

/**
 * Pick the keys of the data, like useAsyncData does.
 */
function pickKeys(data: Record<string, unknown>, keys: string[]) {
  const picked: Record<string, unknown> = {}
  for (const key of keys) {
    picked[key] = data[key]
  }
  return picked
}

function isAsyncFunction(fn: unknown): boolean {
  return Object.prototype.toString.call(fn) === '[object AsyncFunction]'
}

/**
 * The transforms that returned a promise for a cached response, by call site
 * and signature. Nuxt runs them again on the cached request, so the lookup
 * doesn't call them anymore.
 *
 * Only in the browser: on the server, module state is shared by all requests.
 */
const promiseTransforms = importMetaClient ? new Set<string>() : undefined

type AsyncGraphqlQueryOptions<
  FetchOptions,
  ResT,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = undefined,
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

// The overloads only differ in the default of DefaultT (like Nuxt's useAsyncData).
// eslint-disable-next-line @typescript-eslint/unified-signatures
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
  // Nuxt's compiler adds a key for the location of the call as the last
  // argument (optimization.keyedComposables, set in module.ts).
  const callSite =
    typeof args[args.length - 1] === 'string'
      ? ((args as unknown[]).pop() as string)
      : undefined
  const variables = args[0]
  const asyncDataOptions = args[1] || {}
  const asyncDataKey = computed(() => {
    const vars = isRef(variables) ? variables.value : variables
    return `useAsyncGraphqlQuery:${name}:${hash(vars)}`
  })

  const config = useAppConfig()
  const app = useNuxtApp()

  /**
   * The arguments of the request, which also identify it in the client cache.
   */
  function getRequestArgs() {
    return [
      unref(variables as any) || {},
      (asyncDataOptions.fetchOptions || {}) as Record<string, any>,
      clientOptions && clientOptions.buildClientContext
        ? clientOptions.buildClientContext()
        : {},
      asyncDataOptions.clientContext || {},
    ] as const
  }

  /**
   * The key of the request in the client cache.
   */
  function getRequestKey(
    nuxtApp: NuxtApp,
    requestArgs = getRequestArgs(),
    client?: boolean,
  ): string {
    return getRequestCacheKey(
      'query',
      name,
      getRequestParams(nuxtApp, 'query', name, ...requestArgs, client).params,
    )
  }

  // useAsyncData sets its defaults on the options object, so it gets a copy.
  // The transform and pick of a cached response are read from the copy too, so
  // that a cache hit applies what Nuxt applies after a request.
  const options = { ...asyncDataOptions }

  const usesClientCache =
    clientCacheEnabledAtBuild &&
    // Also checked on the server, so that it doesn't record the requests of
    // the payload for nothing.
    !!config.graphqlMiddleware.clientCacheEnabled &&
    !!asyncDataOptions.graphqlCaching?.client &&
    !asyncDataOptions.getCachedData

  const requestKeys = usesClientCache
    ? useState<Record<string, ServerRequest>>(REQUEST_KEYS_STATE, () => ({}))
    : undefined

  if (
    importMetaClient &&
    usesClientCache &&
    // Without a client cache (disabled in the app config) the option has no
    // effect, and Nuxt's default is used.
    getOrCreateClientCache(app, config)
  ) {
    const signature = getTransformSignature(
      options.transform,
      options.pick as string[] | undefined,
    )

    /**
     * The key of a response from the payload, which only fits the call that
     * made it: the same call site, transform and pick.
     */
    const getPayloadKey = (requestKey: string) =>
      `payload:${requestKey}:${callSite || ''}:${signature}`

    // The transform of this call, in promiseTransforms.
    const transformId = `${callSite || ''}:${signature}`

    // Nuxt's middleware option can change the response of the request, which
    // a cached response would skip.
    const hasMiddleware = !!(options as { middleware?: unknown[] }).middleware
      ?.length

    /**
     * Make the data of a cached response, like useAsyncData does after a
     * request.
     */
    const transformCached = function (
      nuxtApp: NuxtApp,
      response: GraphqlResponse<unknown>,
    ) {
      const transform = options.transform as
        ((input: unknown) => any) | undefined
      // The data of an async transform isn't available right away.
      if (
        transform &&
        (isAsyncFunction(transform) || promiseTransforms?.has(transformId))
      ) {
        return
      }

      let data = transform ? transform(response) : response
      if (data && typeof data.then === 'function') {
        // Nuxt runs the transform again on the cached request, so that it
        // isn't called twice on the next cache hits.
        promiseTransforms?.add(transformId)
        Promise.resolve(data).catch(() => {})
        return
      }

      if (options.pick) {
        data = pickKeys(data, options.pick as string[])
      }

      if (import.meta.dev && response.errors?.length) {
        nuxtApp.callHook('nuxt-graphql-middleware:errors', {
          operation: 'query',
          operationName: name,
          errors: response.errors,
          stack: Error().stack,
        })
      }

      return data
    }

    options.getCachedData = function (key, nuxtApp, ctx) {
      const cache = getOrCreateClientCache(nuxtApp, config)
      if (!cache) {
        return
      }

      // On a key that several calls share, Nuxt calls the lookup of the call
      // that created the entry. Once that call's variables have changed, its
      // request is another one.
      const isCurrentKey = key === asyncDataKey.value

      if (ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook') {
        // Nuxt refreshes the entry of the current key, so the responses of
        // other variables stay cached.
        cache.purgeAsyncDataKey(key)
        if (isCurrentKey) {
          try {
            // Also remove a response that is not linked to the key, for
            // example from useGraphqlQuery.
            const requestKey = getRequestKey(nuxtApp)
            cache.remove(requestKey)
            cache.remove(getPayloadKey(requestKey))
          } catch {
            // The handler fails the same way and reports the error.
          }
        }
        return
      }

      // After a watch trigger, the cached request is used. Returning data here
      // would not cancel a request that is still running, which would then
      // overwrite it.
      if (ctx.cause !== 'initial' || !isCurrentKey) {
        return
      }

      try {
        // Like Nuxt's default, the payload is only used during hydration.
        // After that, it might be from another call with another transform:
        // a component that never hydrated, or a request in the browser. Nuxt
        // doesn't purge it, because getCachedData is set.
        if (nuxtApp.isHydrating) {
          const payload = nuxtApp.payload.data[key]
          if (payload !== undefined) {
            // Cached for the request that the server made, if this call made
            // it. Another call that shares the key gets the data from Nuxt,
            // but its transform didn't make it.
            const server = requestKeys?.value[key]
            if (server && server.site === callSite) {
              cache.set(getPayloadKey(server.request), payload, key)
            }
            return payload
          }

          // The server didn't render the key, for example with server: false
          // or after an error, so cached data wouldn't match the HTML. The
          // handler still gets the cached request after hydration.
          if (nuxtApp.payload.serverRendered) {
            return
          }
        }

        // Built after the payload, so that hydration doesn't depend on
        // buildClientContext().
        const requestKey = getRequestKey(nuxtApp)
        const fromPayload = cache.get<any>(getPayloadKey(requestKey))
        if (fromPayload !== undefined) {
          return fromPayload
        }

        if (hasMiddleware) {
          return
        }

        const promise = cache.get<Promise<GraphqlResponse<unknown>>>(requestKey)
        const response = promise ? getCachedResponse(promise) : undefined
        if (response) {
          return transformCached(nuxtApp, response)
        }
      } catch {
        // The handler fails the same way and reports the error.
      }
    }
  }

  /**
   * On the server, the request can't change during the render, so it's built
   * once, for the record and for the handler.
   */
  let serverRequestArgs: ReturnType<typeof getRequestArgs> | undefined

  if (
    importMetaServer &&
    requestKeys &&
    options.server !== false &&
    options.immediate !== false
  ) {
    try {
      serverRequestArgs = getRequestArgs()
      // Recorded during setup, because Nuxt doesn't run the handler on a
      // prerendered page that gets the data from another page. The first call
      // with the key creates Nuxt's entry, so its handler makes the data.
      requestKeys.value[asyncDataKey.value] ??= {
        request: getRequestKey(app, serverRequestArgs, true),
        site: callSite,
      }
    } catch {
      // The handler fails the same way and reports the error.
    }
  }

  const result = useAsyncData<any, any, DataT, PickKeys, DefaultT>(
    asyncDataKey,
    (_app, ctx) => {
      return performRequest<any>(
        'query',
        name,
        ...(serverRequestArgs || getRequestArgs()),
        asyncDataOptions.graphqlCaching || {},
        asyncDataKey.value,
        // Aborted when the request isn't needed anymore, for example after a
        // refresh. Older Nuxt versions don't provide a signal.
        ctx?.signal,
      )
    },
    options as any,
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
