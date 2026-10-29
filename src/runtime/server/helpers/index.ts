import type { QueryObject } from 'ufo'
import type { H3Event } from 'h3'
import {
  createError,
  getRequestHeader,
  readRawBody,
  setResponseHeader,
} from 'h3'
import type { FetchOptions, FetchResponse, FetchError } from 'ofetch'
import type {
  GraphqlMiddlewareRequestContext,
  GraphqlMiddlewareRuntimeConfig,
  GraphqlMiddlewareServerOptions,
} from './../../types'
import {
  CLIENT_CONTEXT_PREFIX,
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
 * The events whose client closed the connection before the response was sent.
 */
const clientAbortedEvents = new WeakSet<H3Event>()

/**
 * Get a signal that is aborted when the client closes the connection before
 * the response was sent.
 *
 * The request emits "close" once its body was read, so the response is used.
 */
export function getClientAbortSignal(
  event: H3Event | null | undefined,
): AbortSignal | undefined {
  const res = event?.node?.res
  if (!event || !res || typeof res.once !== 'function') {
    return
  }

  const controller = new AbortController()
  res.once('close', () => {
    if (!res.writableEnded) {
      clientAbortedEvents.add(event)
      controller.abort(
        new DOMException('The client closed the connection.', 'AbortError'),
      )
    }
  })
  return controller.signal
}

/**
 * Whether the client closed the connection before the response was sent.
 */
export function isClientAborted(event: H3Event | null | undefined): boolean {
  return !!event && clientAbortedEvents.has(event)
}

/**
 * Add the signal for the request to the GraphQL server to the fetch options.
 *
 * The signal is aborted after the timeout and, if given, by the client signal.
 * A timeout or signal from the fetch options replaces the default timeout.
 *
 * A signal is used instead of the timeout option of ofetch, which only limits
 * the time until the response headers arrive. ofetch also ignores its timeout
 * if there is a signal, so a timeout from the fetch options becomes a signal
 * too.
 */
export function withSignal(
  fetchOptions: FetchOptions,
  timeout: number | false | undefined,
  clientSignal?: AbortSignal,
): FetchOptions {
  const signals: AbortSignal[] = []

  if (fetchOptions.signal) {
    signals.push(fetchOptions.signal)
  }

  if (fetchOptions.timeout) {
    signals.push(AbortSignal.timeout(fetchOptions.timeout))
  } else if (
    fetchOptions.timeout === undefined &&
    !fetchOptions.signal &&
    typeof timeout === 'number'
  ) {
    signals.push(AbortSignal.timeout(timeout))
  }

  if (clientSignal) {
    signals.push(clientSignal)
  }

  if (!signals.length) {
    return fetchOptions
  }

  return {
    ...fetchOptions,
    timeout: undefined,
    signal: signals.length === 1 ? signals[0] : AbortSignal.any(signals),
  }
}

/**
 * Whether the request to the GraphQL server was aborted by a timeout.
 *
 * Errors while reading the response are not wrapped in a FetchError.
 */
function isTimeoutError(error: unknown): boolean {
  const value = error as { name?: string; cause?: { name?: string } } | null
  return value?.name === 'TimeoutError' || value?.cause?.name === 'TimeoutError'
}

export function throwError(statusMessage: string, statusCode = 400): never {
  throw createError({
    statusCode,
    statusMessage,
  })
}

function getMediaType(event: H3Event): string {
  const contentType = getRequestHeader(event, 'content-type') || ''
  return contentType.split(';')[0]!.trim().toLowerCase()
}

/**
 * Refuse the request because its body is too large.
 *
 * The connection is closed after the response, so that the server doesn't
 * keep reading the rest of the body.
 */
function throwBodyTooLarge(event: H3Event, limit: number): never {
  setResponseHeader(event, 'connection', 'close')
  return throwError(
    `The request body must not be larger than ${limit} bytes.`,
    413,
  )
}

/**
 * Read the raw request body, refusing it if it's larger than the limit.
 */
export async function readLimitedBody(
  event: H3Event,
  limit: number | false | undefined,
): Promise<Buffer | undefined> {
  if (typeof limit !== 'number') {
    return readRawBody(event, false)
  }

  const contentLength = Number(getRequestHeader(event, 'content-length'))
  if (contentLength > limit) {
    return throwBodyTooLarge(event, limit)
  }

  // Chunked requests have no content length, so the bytes are also counted
  // while reading. Once there are too many, the request is destroyed, which
  // stops reading.
  let size = 0
  let onTooLarge = () => {}
  const tooLarge = new Promise<never>((_resolve, reject) => {
    onTooLarge = () => reject(new Error('Request body too large.'))
  })
  const req = event.node.req
  const onData = (chunk: Buffer) => {
    size += chunk.length
    if (size > limit) {
      req.off('data', onData)
      req.destroy()
      onTooLarge()
    }
  }
  const promise = readRawBody(event, false)
  // Requests whose body was already read, for example by the platform, may
  // not be streams.
  const isStream = typeof req.on === 'function'
  if (isStream) {
    req.on('data', onData)
  }

  try {
    const body = await Promise.race([promise, tooLarge])
    if (body && body.length > limit) {
      return throwBodyTooLarge(event, limit)
    }
    return body
  } catch (error) {
    if (size > limit) {
      return throwBodyTooLarge(event, limit)
    }
    throw error
  } finally {
    if (isStream) {
      req.off('data', onData)
    }
  }
}

/**
 * Drop keys that would change the prototype of the parsed objects.
 */
function dropPrototypeKeys(key: string, value: unknown) {
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
 * Read the JSON object from the request body.
 *
 * Only requests with the "application/json" content type are accepted. Forms
 * and text can be sent by browsers from other origins without a CORS
 * preflight, JSON only after one, which the middleware doesn't answer.
 */
export async function readJsonBody(
  event: H3Event,
  limit: number | false | undefined,
): Promise<Record<string, any> | undefined> {
  if (getMediaType(event) !== 'application/json') {
    return throwError(
      'The request body must use the "application/json" content type.',
      415,
    )
  }

  const text = (await readLimitedBody(event, limit))?.toString('utf8')
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
export async function readMultipartBody(
  event: H3Event,
  limit: number | false | undefined,
): Promise<FormData> {
  if (getMediaType(event) !== 'multipart/form-data') {
    return throwError('Failed to read multi part data.')
  }

  const body = await readLimitedBody(event, limit)

  try {
    // Uses the same parser as readFormData() from h3. It needs a fraction of
    // the memory of readMultipartFormData(), which copies every byte into an
    // array.
    return await new Response(body as Uint8Array<ArrayBuffer> | undefined, {
      headers: { 'content-type': getRequestHeader(event, 'content-type')! },
    }).formData()
  } catch {
    return throwError('Failed to read multi part data.')
  }
}

/**
 * Handle GraphQL server response.
 */
export function onServerResponse(
  serverOptions: GraphqlMiddlewareServerOptions<any, any>,
  event: H3Event,
  response: FetchResponse<any>,
  operation: string | null,
  operationName: string | null,
  context: GraphqlMiddlewareRequestContext<any> | null,
) {
  if (serverOptions.onServerResponse) {
    return serverOptions.onServerResponse(
      event,
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
    throw createError({ statusCode: 502, statusMessage: details })
  }
  console.error('[nuxt-graphql-middleware] ' + details)
  throw createError({
    statusCode: 502,
    statusMessage: 'Invalid response from the GraphQL server.',
  })
}

/**
 * Handle GraphQL server errors.
 */
export function onServerError(
  serverOptions: GraphqlMiddlewareServerOptions<any, any>,
  event: H3Event,
  error: FetchError,
  operation: string | null,
  operationName: string | null,
  context: GraphqlMiddlewareRequestContext<any> | null,
) {
  if (serverOptions.onServerError) {
    return serverOptions.onServerError(
      event,
      error,
      operation,
      operationName,
      context,
    )
  }
  // Nobody receives the response, so there is nothing to log.
  if (isClientAborted(event)) {
    throw createError({
      statusCode: 499,
      statusMessage: 'The client closed the connection.',
    })
  }

  const message = error && 'message' in error ? error.message : ''
  const data = error?.response?._data
  const isTimeout = isTimeoutError(error)
  const statusCode = isTimeout ? 504 : 500

  if (import.meta.dev) {
    throw createError({
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
  throw createError({
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
