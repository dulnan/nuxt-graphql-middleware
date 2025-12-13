import type { QueryObject } from 'ufo'
import type { H3Event } from 'h3'
import { createError } from 'h3'
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
