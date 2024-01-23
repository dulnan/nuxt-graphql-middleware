import { type QueryObject } from 'ufo'
import type { H3Event } from 'h3'
import { createError } from 'h3'
import type { FetchOptions, FetchResponse, FetchError } from 'ofetch'
import type {
  GraphqlMiddlewareRuntimeConfig,
  GraphqlMiddlewareServerOptions,
} from './../../../types'
import { GraphqlMiddlewareOperation } from './../../settings'

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
  } catch (_e) {}

  return query
}

/**
 * Get the URL of the GraphQL endpoint.
 */
export function getEndpoint(
  config: GraphqlMiddlewareRuntimeConfig,
  serverOptions: GraphqlMiddlewareServerOptions,
  event: H3Event,
  operation: GraphqlMiddlewareOperation,
  operationName: string,
): string | Promise<string> {
  // Check if a custom graphqlEndpoint method exists.
  if (serverOptions.graphqlEndpoint) {
    const result = serverOptions.graphqlEndpoint(
      event,
      operation,
      operationName,
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
  serverOptions: GraphqlMiddlewareServerOptions,
  event: H3Event,
  operation: GraphqlMiddlewareOperation,
  operationName: string,
): FetchOptions | Promise<FetchOptions> {
  if (serverOptions.serverFetchOptions) {
    return (
      serverOptions.serverFetchOptions(event, operation, operationName) || {}
    )
  }

  return {}
}

function throwError(statusMessage: string, statusCode = 400): never {
  throw createError({
    statusCode,
    statusMessage,
  })
}

/**
 * Assure that the request is valid.
 */
export function validateRequest(
  method?: string,
  operation?: GraphqlMiddlewareOperation,
  name?: string,
  documents?: Record<string, Record<string, string>>,
): void {
  if (method !== 'POST' && method !== 'GET') {
    throwError('Method not allowed.', 405)
  }

  if (
    operation !== GraphqlMiddlewareOperation.Query &&
    operation !== GraphqlMiddlewareOperation.Mutation
  ) {
    throwError('Unknown operation.')
  }

  // Only allow POST for /mutation/:name.
  if (method === 'POST' && operation !== GraphqlMiddlewareOperation.Mutation) {
    throwError('Queries must be a GET request.')
  }

  // Only allow GET for /query/:name.
  if (method === 'GET' && operation !== GraphqlMiddlewareOperation.Query) {
    throwError('Mutations must be a POST request.')
  }

  if (!name) {
    throwError('Missing name for operation.')
  }

  if (!documents) {
    throwError('Failed to load GraphQL documents', 500)
  }

  if (!documents[operation][name]) {
    throwError(`Operation "${operation}" with name "${name}" not found.`)
  }
}

/**
 * Handle GraphQL server response.
 */
export function onServerResponse(
  serverOptions: GraphqlMiddlewareServerOptions,
  event: H3Event,
  response: FetchResponse<any>,
  operation?: string,
  operationName?: string,
) {
  if (serverOptions.onServerResponse) {
    return serverOptions.onServerResponse(
      event,
      response,
      operation,
      operationName,
    )
  }

  return response._data
}

/**
 * Handle GraphQL server errors.
 */
export function onServerError(
  serverOptions: GraphqlMiddlewareServerOptions,
  event: H3Event,
  error: FetchError,
  operation?: string,
  operationName?: string,
) {
  if (serverOptions.onServerError) {
    return serverOptions.onServerError(event, error, operation, operationName)
  }
  const message = error && 'message' in error ? error.message : ''
  throw createError({
    statusCode: 500,
    statusMessage: "Couldn't execute GraphQL query: " + message,
    data: error && 'message' in error ? error.message : error,
  })
}
