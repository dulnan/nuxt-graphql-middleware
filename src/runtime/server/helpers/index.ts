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

  return response._data
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
  const message = error && 'message' in error ? error.message : ''
  throw createError({
    statusCode: 500,
    statusMessage: "Couldn't execute GraphQL query: " + message,
    data: error.response?._data,
  })
}
