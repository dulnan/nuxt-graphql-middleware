import type { H3Event } from 'h3'
import {
  createError,
  getRequestHeader,
  isError,
  readRawBody,
  setResponseHeader,
} from 'h3'
import type { FetchResponse, FetchError } from 'ofetch'
import type {
  GraphqlMiddlewareRequestContext,
  GraphqlMiddlewareServerOptions,
} from './../../types'
import { SSR_ABORT_SIGNAL_KEY } from './../../settings'
import {
  getConnectionAbortSignal,
  isConnectionAborted,
} from './../../helpers/abort'
import { dropPrototypeKeys, isTimeoutError } from './shared'

export * from './shared'

/**
 * Get the signal for the connection of the page from the fetch context.
 *
 * Queries performed by the composables during SSR are made in the same
 * process, so their own connection is never closed. The composables pass a
 * signal for the connection of the page in the fetch context instead, which
 * Nitro puts on the request.
 */
function getSsrAbortSignal(event: H3Event): AbortSignal | undefined {
  const fetchContext = (
    event.node?.req as { __unenv__?: Record<string, unknown> } | undefined
  )?.__unenv__
  const signal = fetchContext?.[SSR_ABORT_SIGNAL_KEY]
  return signal instanceof AbortSignal ? signal : undefined
}

/**
 * Get a signal that is aborted when the client closes the connection before
 * the response was sent.
 *
 * Returns nothing if the response might be cached and sent to other clients,
 * for example with the cache or swr route rules.
 */
export function getClientAbortSignal(
  event: H3Event | null | undefined,
): AbortSignal | undefined {
  if (!event || event.context?.cache) {
    return
  }
  return getSsrAbortSignal(event) ?? getConnectionAbortSignal(event)
}

/**
 * Whether the client closed the connection before the response was sent.
 */
export function isClientAborted(event: H3Event | null | undefined): boolean {
  if (!event || event.context?.cache) {
    return false
  }
  return getSsrAbortSignal(event)?.aborted ?? isConnectionAborted(event)
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
 *
 * 0, false and undefined disable the limit.
 *
 * The bytes are a Buffer with h3 v1, but a plain Uint8Array with the h3 v1
 * compatibility layer of Nuxt on Nitro v3. Callers must not rely on Buffer
 * methods.
 */
export async function readLimitedBody(
  event: H3Event,
  limit: number | false | undefined,
): Promise<Uint8Array | undefined> {
  if (!limit) {
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

  // Not Buffer.toString(): on a plain Uint8Array it returns the bytes as a
  // comma separated list of numbers ("123,34,..."), which is no JSON.
  const bytes = await readLimitedBody(event, limit)
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

  // Errors thrown by onServerResponse, such as the 502 for responses that
  // aren't JSON, already have a status code, so they are passed on as they are.
  if (isError(error)) {
    throw error
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
