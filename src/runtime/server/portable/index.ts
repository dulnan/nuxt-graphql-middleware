import {
  createError,
  getQuery,
  getRequestHeader,
  getRouterParam,
  isNuxtError,
  useRuntimeConfig,
  type RequestEvent,
} from 'nuxt/server'
import { $fetch } from 'ofetch'
import { createHelpers } from '../helpers/shared'
import { createHandlers } from '../handlers'

/**
 * Get a signal that is aborted when the client closes the connection before
 * the response was sent.
 *
 * Returns nothing if the response might be cached and sent to other clients,
 * for example with the cache or swr route rules.
 */
function getClientAbortSignal(event: RequestEvent): AbortSignal | undefined {
  return event.context.cache ? undefined : event.req.signal
}

function isClientAborted(event: RequestEvent): boolean {
  return !!getClientAbortSignal(event)?.aborted
}

/**
 * Refuse the request because its body is too large.
 *
 * The connection is closed after the response, so that the server doesn't
 * keep reading the rest of the body.
 */
function throwBodyTooLarge(event: RequestEvent, limit: number): never {
  event.res.headers.set('connection', 'close')
  return helpers.throwError(
    `The request body must not be larger than ${limit} bytes.`,
    413,
  )
}

/**
 * Read the raw request body, refusing it if it's larger than the limit.
 *
 * 0, false and undefined disable the limit.
 */
async function readLimitedBody(
  event: RequestEvent,
  limit: number | false | undefined,
): Promise<Uint8Array | undefined> {
  if (limit && Number(event.req.headers.get('content-length')) > limit) {
    return throwBodyTooLarge(event, limit)
  }

  // Chunked requests have no content length, so the bytes are counted while
  // reading.
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let size = 0
  const reader = event.req.body?.getReader()
  while (reader) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    size += value.length
    if (limit && size > limit) {
      await reader.cancel()
      return throwBodyTooLarge(event, limit)
    }
    chunks.push(value)
  }
  return size ? new Uint8Array(await new Blob(chunks).arrayBuffer()) : undefined
}

const helpers = createHelpers<RequestEvent>({
  createError,
  isError: isNuxtError,
  getRequestHeader,
  readLimitedBody,
  isClientAborted,
})

export const handlers = createHandlers<RequestEvent>({
  ...helpers,
  getQuery,
  getRouterParam,
  getRequestHeader,
  getClientAbortSignal,
  useRuntimeConfig,
  fetchRaw: (url, options) => $fetch.raw(url, options),
})
