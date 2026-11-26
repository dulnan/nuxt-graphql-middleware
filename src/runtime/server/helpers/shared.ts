import type { QueryObject } from 'ufo'
import type { H3Event } from 'h3'
import type { FetchOptions, FetchResponse, FetchError } from 'ofetch'
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

/**
 * The functions of the server API that the helpers below call: h3 v1 on
 * Nitro v2 and nuxt/server on other servers.
 */
export type ServerApi<E> = {
  createError: (input: {
    statusCode: number
    statusMessage: string
    data?: unknown
  }) => Error
  isError: (error: unknown) => boolean
  getRequestHeader: (event: E, name: string) => string | undefined
  readLimitedBody: (
    event: E,
    limit: number | false | undefined,
  ) => Promise<Uint8Array | undefined>
  isClientAborted: (event: E) => boolean
}

/**
 * Create the helpers that use the server API.
 *
 * The server options are typed with the h3 v1 event, so the event is passed to
 * them as one.
 */
export function createHelpers<E>(api: ServerApi<E>) {
  function throwError(statusMessage: string, statusCode = 400): never {
    throw api.createError({
      statusCode,
      statusMessage,
    })
  }

  function getMediaType(event: E): string {
    const contentType = api.getRequestHeader(event, 'content-type') || ''
    return contentType.split(';')[0]!.trim().toLowerCase()
  }

  /**
   * Read the JSON object from the request body.
   *
   * Only requests with the "application/json" content type are accepted. Forms
   * and text can be sent by browsers from other origins without a CORS
   * preflight, JSON only after one, which the middleware doesn't answer.
   */
  async function readJsonBody(
    event: E,
    limit: number | false | undefined,
  ): Promise<Record<string, any> | undefined> {
    if (getMediaType(event) !== 'application/json') {
      return throwError(
        'The request body must use the "application/json" content type.',
        415,
      )
    }

    // Not Buffer.toString(): on a plain Uint8Array it returns the bytes as a
    // comma separated list of numbers ("123,34,..."), which is no JSON.
    const bytes = await api.readLimitedBody(event, limit)
    const text = bytes ? new TextDecoder().decode(bytes) : undefined
    if (!text) {
      return undefined
    }

    let body: unknown
    try {
      body = JSON.parse(text, dropPrototypeKeys)
    } catch {
      return throwError('Invalid JSON body.')
    }

    if (body === null) {
      return undefined
    } else if (typeof body !== 'object' || Array.isArray(body)) {
      return throwError('The request body must be a JSON object.')
    }

    return body as Record<string, any>
  }

  /**
   * Read the multipart form data from the request body.
   */
  async function readMultipartBody(
    event: E,
    limit: number | false | undefined,
  ): Promise<FormData> {
    if (getMediaType(event) !== 'multipart/form-data') {
      return throwError('Failed to read multi part data.')
    }

    const body = await api.readLimitedBody(event, limit)

    try {
      // Uses the same parser as readFormData() from h3. It needs a fraction of
      // the memory of readMultipartFormData(), which copies every byte into an
      // array.
      return await new Response(body as Uint8Array<ArrayBuffer> | undefined, {
        headers: {
          'content-type': api.getRequestHeader(event, 'content-type')!,
        },
      }).formData()
    } catch {
      return throwError('Failed to read multi part data.')
    }
  }

  /**
   * Handle GraphQL server response.
   */
  function onServerResponse(
    serverOptions: GraphqlMiddlewareServerOptions<any, any>,
    event: E,
    response: FetchResponse<any>,
    operation: string | null,
    operationName: string | null,
    context: GraphqlMiddlewareRequestContext<any> | null,
  ) {
    if (serverOptions.onServerResponse) {
      return serverOptions.onServerResponse(
        event as unknown as H3Event,
        response,
        operation,
        operationName,
        context,
      )
    }

    const data = response._data
    const prototype =
      data && typeof data === 'object' ? Object.getPrototypeOf(data) : undefined
    if (prototype === Object.prototype || prototype === null) {
      return data
    }

    // Only GraphQL responses (JSON objects) are passed on. h3 would send other
    // responses, such as text or an error page from a proxy, as HTML.
    const details = `Invalid response from the GraphQL server for ${operation} "${operationName}" (content type: ${response.headers?.get('content-type') || 'none'}).`
    if (import.meta.dev) {
      throw api.createError({ statusCode: 502, statusMessage: details })
    }
    console.error('[nuxt-graphql-middleware] ' + details)
    throw api.createError({
      statusCode: 502,
      statusMessage: 'Invalid response from the GraphQL server.',
    })
  }

  /**
   * Handle GraphQL server errors.
   */
  function onServerError(
    serverOptions: GraphqlMiddlewareServerOptions<any, any>,
    event: E,
    error: FetchError,
    operation: string | null,
    operationName: string | null,
    context: GraphqlMiddlewareRequestContext<any> | null,
  ) {
    if (serverOptions.onServerError) {
      return serverOptions.onServerError(
        event as unknown as H3Event,
        error,
        operation,
        operationName,
        context,
      )
    }

    // Errors thrown by onServerResponse, such as the 502 for responses that
    // aren't JSON, already have a status code, so they are passed on as they are.
    if (api.isError(error)) {
      throw error
    }

    // Nobody receives the response, so there is nothing to log.
    if (api.isClientAborted(event)) {
      throw api.createError({
        statusCode: 499,
        statusMessage: 'The client closed the connection.',
      })
    }

    const message = error && 'message' in error ? error.message : ''
    const data = error?.response?._data
    const isTimeout = isTimeoutError(error)
    const statusCode = isTimeout ? 504 : 500

    if (import.meta.dev) {
      throw api.createError({
        statusCode,
        statusMessage: "Couldn't execute GraphQL query: " + message,
        data,
      })
    }

    // The message contains the URL of the GraphQL server and the response may
    // contain anything, for example an error page. So only the GraphQL errors
    // are sent to the client and the message is logged instead.
    console.error(
      `[nuxt-graphql-middleware] Couldn't execute GraphQL ${operation} "${operationName}": ${message}`,
    )
    throw api.createError({
      statusCode,
      statusMessage: isTimeout
        ? "The GraphQL server didn't respond in time."
        : "Couldn't execute GraphQL query.",
      data:
        data && typeof data === 'object' && Array.isArray(data.errors)
          ? { errors: data.errors }
          : undefined,
    })
  }

  return {
    throwError,
    readJsonBody,
    readMultipartBody,
    onServerResponse,
    onServerError,
  }
}
