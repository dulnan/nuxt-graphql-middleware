import {
  getOrCreateClientCache,
  type KeysOf,
  type PickFrom,
} from './../helpers/composables'
import type { FetchOptions } from 'ofetch'
import { type Ref, isRef, unref } from 'vue'
import { performRequest } from './nuxtApp'
import {
  clientOptions,
  type GraphqlClientContext,
} from '#nuxt-graphql-middleware/client-options'
import { useAsyncData, useAppConfig, useNuxtApp, computed } from '#imports'
import { hash } from 'ohash'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import type { RequestCacheOptions } from './../types'
import type { AsyncData, AsyncDataOptions, NuxtApp, NuxtError } from '#app'
import type { Query } from '#nuxt-graphql-middleware/operation-types'
import { importMetaClient } from '#nuxt-graphql-middleware/config'

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

  if (
    importMetaClient &&
    asyncDataOptions.graphqlCaching?.client &&
    !asyncDataOptions.getCachedData &&
    // Without a client cache (disabled in the module options or in the app
    // config) the option has no effect, and Nuxt's default is used.
    getOrCreateClientCache(app, config)
  ) {
    asyncDataOptions.getCachedData = function (key, nuxtApp, ctx) {
      const cache = getOrCreateClientCache(nuxtApp, config)
      if (!cache) {
        return
      }

      if (ctx.cause === 'initial') {
        // Nuxt doesn't purge the payload if getCachedData is set, so the
        // payload is only used for the first lookup of a key: During
        // hydration, or later for a component with delayed hydration. The
        // response is stored in the cache and linked to its own key, so that a
        // refresh removes it.
        if (isFirstLookup(nuxtApp, key)) {
          const payload = nuxtApp.payload.data[key]
          if (payload !== undefined) {
            cache.set(key, payload, key)
            return payload
          }
        }

        return cache.get(key)
      } else if (
        ctx.cause === 'refresh:manual' ||
        ctx.cause === 'refresh:hook'
      ) {
        cache.purgeAsyncDataKey(key)
        cache.purgeAsyncDataKey(prevKey)
      }
    }
  }

  const result = useAsyncData<any, any, DataT, PickKeys, DefaultT>(
    asyncDataKey,
    (_app, ctx) => {
      prevKey = asyncDataKey.value
      const globalClientContext =
        clientOptions && clientOptions.buildClientContext
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
        asyncDataKey.value,
        // Aborted when the request isn't needed anymore, for example after a
        // refresh. Older Nuxt versions don't provide a signal.
        ctx?.signal,
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
