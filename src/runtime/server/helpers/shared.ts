import type { QueryObject } from 'ufo'
import type { H3Event } from 'h3'
import type { FetchOptions } from 'ofetch'
import type {
  GraphqlMiddlewareRequestContext,
  GraphqlMiddlewareRuntimeConfig,
  GraphqlMiddlewareServerOptions,
} from './../../types'
import {
  CLIENT_CONTEXT_PREFIX,
  DEFAULT_BODY_SIZE_LIMIT,
  DEFAULT_GRAPHQL_SERVER_TIMEOUT,
  isValidLimit,
  MAX_TIMEOUT,
  type GraphqlMiddlewareOperation,
} from './../../settings'
import { documents } from '#nuxt-graphql-middleware/documents'
import type { Mutation, Query } from '#nuxt-graphql-middleware/operation-types'

export function isValidMutation(v?: string): v is keyof Mutation {
  return !!v && Object.hasOwn(documents.mutation, v)
}

export function isValidQuery(v?: string): v is keyof Query {
  return !!v && Object.hasOwn(documents.query, v)
}

// Get the variables from query parameters.
//
// For simple cases, e.g. when only primitive variable values are sent:
// ?path=foobar
//
// In complex cases, the entire variables are sent as a JSON encoded string:
// ?__variables=%7B%22foobar%22:%7B%22path%22:%22%22%7D%7D
export function queryParamToVariables(query: QueryObject) {
  try {
    if (query.__variables && typeof query.__variables === 'string') {
      return JSON.parse(query.__variables)
    }
  } catch {
    // Noop.
  }

  return query
}

/**
 * Extract the client context from the query params.
 */
export function extractRequestContext(
  query: QueryObject,
): GraphqlMiddlewareRequestContext<any> {
  const client: Record<string, string> = {}

  for (const property in query) {
    if (property.startsWith(CLIENT_CONTEXT_PREFIX)) {
      const value = query[property]
      if (typeof value === 'string') {
        const key = property.replace(CLIENT_CONTEXT_PREFIX, '')
        client[key] = value
      }
    }
  }

  return {
    client,
  }
}

/**
 * Get the URL of the GraphQL endpoint.
 */
export function getEndpoint(
  config: GraphqlMiddlewareRuntimeConfig,
  serverOptions: GraphqlMiddlewareServerOptions<any, any>,
  event: H3Event,
  operation: GraphqlMiddlewareOperation | null,
  operationName: string | null,
  context: GraphqlMiddlewareRequestContext<any> | null,
): string | Promise<string> {
  // Check if a custom graphqlEndpoint method exists.
  if (serverOptions.graphqlEndpoint) {
    const result = serverOptions.graphqlEndpoint(
      event,
      operation,
      operationName,
      context,
    )

    // Only return if the method returned somethind. This way we fall back to
    // config at build time.
    if (result) {
      return Promise.resolve(result)
    }
  }
  if (config.graphqlEndpoint) {
    return config.graphqlEndpoint
  }
  throw new Error('Failed to determine endpoint for GraphQL server.')
}

/**
 * Get the options for the $fetch request to the GraphQL server.
 */
export function getFetchOptions(
  serverOptions: GraphqlMiddlewareServerOptions<any, any>,
  event: H3Event,
  operation: GraphqlMiddlewareOperation | null,
  operationName: string | null,
  context: GraphqlMiddlewareRequestContext<any> | null,
): FetchOptions | Promise<FetchOptions> {
  if (serverOptions.serverFetchOptions) {
    return (
      serverOptions.serverFetchOptions(
        event,
        operation,
        operationName,
        context,
      ) || {}
    )
  }

  return {}
}

/**
 * The names of the options with an invalid value that was logged.
 *
 * Only the names are kept, because a timeout from the server options can be
 * different for every request.
 */
const loggedInvalidLimits = new Set<string>()

/**
 * Get the value if it is a valid timeout or size limit, else the fallback.
 *
 * The build fails for invalid values in the module options, but environment
 * variables and the server options can set any value at runtime. The first
 * invalid value of each option is logged.
 */
function getValidLimit(
  name: string,
  value: unknown,
  fallback: number | false,
  max?: number,
): number | false {
  if (isValidLimit(value, max)) {
    return value
  }

  if (!loggedInvalidLimits.has(name)) {
    loggedInvalidLimits.add(name)
    console.warn(
      `[nuxt-graphql-middleware] Invalid ${name}: ${String(value)}. Using ${fallback} instead.`,
    )
  }
  return fallback
}

/**
 * Get the body size limit for mutations or uploads from the runtime config.
 */
export function getBodySizeLimit(
  limits: GraphqlMiddlewareRuntimeConfig['bodySizeLimit'],
  type: 'mutation' | 'upload',
): number | false {
  const value = limits?.[type]
  const fallback = DEFAULT_BODY_SIZE_LIMIT[type]
  return value === undefined
    ? fallback
    : getValidLimit(`bodySizeLimit.${type}`, value, fallback)
}

/**
 * Add the signal for the request to the GraphQL server to the fetch options.
 *
 * The signal is aborted after the timeout and by the client signal and the
 * signal from the fetch options, if given. A timeout or signal from the fetch
 * options replaces the default timeout.
 *
 * A signal is used instead of the timeout option of ofetch, which only limits
 * the time until the response headers arrive. ofetch also ignores its timeout
 * if there is a signal, so a timeout from the fetch options becomes a signal
 * too.
 *
 * Call done() once the request is settled: it clears the timer and removes the
 * listeners from the other signals. AbortSignal.timeout() and AbortSignal.any()
 * are not used, because Node keeps a signal of AbortSignal.any() with a
 * timeout in memory until the timer fires, also after the request is done.
 */
export function withSignal(
  fetchOptions: FetchOptions,
  timeout: number | false | undefined,
  clientSignal?: AbortSignal,
): { fetchOptions: FetchOptions; done: () => void } {
  const defaultTimeout =
    timeout === undefined
      ? DEFAULT_GRAPHQL_SERVER_TIMEOUT
      : getValidLimit(
          'graphqlServerTimeout',
          timeout,
          DEFAULT_GRAPHQL_SERVER_TIMEOUT,
          MAX_TIMEOUT,
        )

  // A timeout from the fetch options replaces the default timeout, also if it
  // disables it. A signal from the fetch options replaces it too.
  let ms: number | false = false
  if (fetchOptions.timeout !== undefined) {
    ms = getValidLimit(
      'timeout from serverFetchOptions',
      fetchOptions.timeout,
      defaultTimeout,
      MAX_TIMEOUT,
    )
  } else if (!fetchOptions.signal) {
    ms = defaultTimeout
  }

  const signals = [fetchOptions.signal, clientSignal].filter(
    (v): v is AbortSignal => !!v,
  )

  // Without a timeout, a single signal can be used as it is.
  if (!ms && signals.length <= 1) {
    const signal = signals[0]
    if (signal) {
      return {
        fetchOptions: { ...fetchOptions, timeout: undefined, signal },
        done: () => {},
      }
    }
    // ofetch would still use an invalid timeout, for example -1.
    return {
      fetchOptions:
        fetchOptions.timeout === undefined
          ? fetchOptions
          : { ...fetchOptions, timeout: undefined },
      done: () => {},
    }
  }

  const controller = new AbortController()
  const onAbort = (event: Event) => {
    controller.abort((event.target as AbortSignal).reason)
  }
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  const timer = ms
    ? setTimeout(() => {
        controller.abort(
          new DOMException(
            'The operation was aborted due to timeout',
            'TimeoutError',
          ),
        )
      }, ms)
    : undefined

  return {
    fetchOptions: {
      ...fetchOptions,
      timeout: undefined,
      signal: controller.signal,
    },
    done: () => {
      clearTimeout(timer)
      for (const signal of signals) {
        signal.removeEventListener('abort', onAbort)
      }
    },
  }
}

/**
 * Whether the request to the GraphQL server was aborted by a timeout.
 *
 * Errors while reading the response are not wrapped in a FetchError.
 */
export function isTimeoutError(error: unknown): boolean {
  const value = error as { name?: string; cause?: { name?: string } } | null
  return value?.name === 'TimeoutError' || value?.cause?.name === 'TimeoutError'
}

/**
 * Drop keys that would change the prototype of the parsed objects.
 */
export function dropPrototypeKeys(key: string, value: unknown) {
  if (
    key === '__proto__' ||
    (key === 'constructor' &&
      value &&
      typeof value === 'object' &&
      'prototype' in value)
  ) {
    return undefined
  }
  return value
}
