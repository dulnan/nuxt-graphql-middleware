import type { H3Event } from 'h3'
import {
  createError,
  getRequestHeader,
  isError,
  readRawBody,
  setResponseHeader,
} from 'h3'
import { SSR_ABORT_SIGNAL_KEY } from './../../settings'
import {
  getConnectionAbortSignal,
  isConnectionAborted,
} from './../../helpers/abort'
import { createHelpers } from './shared'

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

export const {
  throwError,
  readJsonBody,
  readMultipartBody,
  onServerResponse,
  onServerError,
} = createHelpers<H3Event>({
  createError,
  isError,
  getRequestHeader,
  readLimitedBody,
  isClientAborted,
})
