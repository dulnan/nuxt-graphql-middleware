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
 * The state with the request of each response in the payload, by async data
 * key. The server records it, so that the browser caches a response from the
 * payload for the request that was made.
 */
const REQUEST_KEYS_STATE = 'nuxt-graphql-middleware:request-keys'

/**
 * Matches the source of native and bound functions, like Nuxt does.
 */
const NATIVE_CODE_RE = /\{\s*\[native code\]\s*\}/

/**
 * Identify the transform and pick of a call. Like in Nuxt's check for
 * incompatible options, closures with the same source count as the same
 * function.
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
 * The async data keys that were looked up in the client cache, per app.
 */
const lookedUpKeys = new WeakMap<NuxtApp, Set<string>>()

/**
 * Whether this is the first lookup of the async data key in the app.
 */
function isFirstLookup(app: NuxtApp, key: string): boolean {
  let keys = lookedUpKeys.get(app)
  if (!keys) {
    keys = new Set()
    lookedUpKeys.set(app, keys)
  }

  if (keys.has(key)) {
    return false
  }

  keys.add(key)
  return true
}

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
  const variables = args[0]
  const asyncDataOptions = args[1] || {}
  const asyncDataKey = computed(() => {
    const vars = isRef(variables) ? variables.value : variables
    return `useAsyncGraphqlQuery:${name}:${hash(vars)}`
  })

  // Store the previous key so that we can invlidate it.
  let prevKey = ''

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
  const options = { ...asyncDataOptions }

  const usesClientCache =
    clientCacheEnabledAtBuild &&
    !!asyncDataOptions.graphqlCaching?.client &&
    !asyncDataOptions.getCachedData

  const requestKeys = usesClientCache
    ? useState<Record<string, string>>(REQUEST_KEYS_STATE, () => ({}))
    : undefined

  if (
    importMetaClient &&
    usesClientCache &&
    // Without a client cache (disabled in the app config) the option has no
    // effect, and Nuxt's default is used.
    getOrCreateClientCache(app, config)
  ) {
    const signature = getTransformSignature(
      asyncDataOptions.transform,
      asyncDataOptions.pick as string[] | undefined,
    )

    /**
     * The key of a response from the payload, which only fits the transform
     * and pick that made it.
     */
    const getPayloadKey = (requestKey: string) =>
      `payload:${requestKey}:${signature}`

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
      const transform = asyncDataOptions.transform as
        ((input: unknown) => any) | undefined
      // The data of an async transform isn't available right away.
      if (transform && isAsyncFunction(transform)) {
        return
      }

      let data = transform ? transform(response) : response
      if (data && typeof data.then === 'function') {
        Promise.resolve(data).catch(() => {})
        return
      }

      if (asyncDataOptions.pick) {
        data = pickKeys(data, asyncDataOptions.pick as string[])
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
        cache.purgeAsyncDataKey(key)
        cache.purgeAsyncDataKey(prevKey)
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
        const requestKey = getRequestKey(nuxtApp)

        // Nuxt doesn't purge the payload if getCachedData is set, so the
        // payload is only used for the first lookup of a key.
        if (isFirstLookup(nuxtApp, key)) {
          const payload = nuxtApp.payload.data[key]
          if (payload !== undefined) {
            const serverRequestKey = requestKeys?.value[key]
            if (nuxtApp.isHydrating) {
              // Cached for the request that the server made.
              if (serverRequestKey) {
                cache.set(getPayloadKey(serverRequestKey), payload, key)
              }
              return payload
            }

            // After hydration, for example for a component with delayed
            // hydration. The payload might also be from a component that was
            // never hydrated and has another transform, so it isn't cached.
            if (serverRequestKey === requestKey) {
              return payload
            }
          }
        }

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

  const result = useAsyncData<any, any, DataT, PickKeys, DefaultT>(
    asyncDataKey,
    (_app, ctx) => {
      prevKey = asyncDataKey.value
      const requestArgs = getRequestArgs()

      if (importMetaServer && requestKeys) {
        requestKeys.value[asyncDataKey.value] = getRequestKey(
          app,
          requestArgs,
          true,
        )
      }

      return performRequest<any>(
        'query',
        name,
        ...requestArgs,
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
