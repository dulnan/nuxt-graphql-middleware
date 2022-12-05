import { QueryObject } from 'ufo'
import type { H3Event } from 'h3'
import { createError } from 'h3'
import type { FetchOptions } from 'ofetch'
import type { GraphqlMiddlewareConfig } from './../../../types'
import { GraphqlMiddlewareOperation } from './../../../types'

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
  moduleConfig: GraphqlMiddlewareConfig,
  event: H3Event,
  operation: GraphqlMiddlewareOperation,
  operationName: string,
): string {
  if (typeof moduleConfig.graphqlEndpoint === 'string') {
    return moduleConfig.graphqlEndpoint
  } else if (typeof moduleConfig.graphqlEndpoint === 'function') {
    const endpoint = moduleConfig.graphqlEndpoint(
      event,
      operation,
      operationName,
    )
    if (endpoint && typeof endpoint === 'string') {
      return endpoint
    }
  }
  throw new Error('Failed to determine endpoint for GraphQL server.')
}

/**
 * Get the options for the $fetch request to the GraphQL server.
 */
export function getFetchOptions(
  moduleConfig: GraphqlMiddlewareConfig,
  event: H3Event,
  operation: GraphqlMiddlewareOperation,
  operationName: string,
): FetchOptions {
  if (typeof moduleConfig.serverFetchOptions === 'function') {
    return (
      moduleConfig.serverFetchOptions(event, operation, operationName) || {}
    )
  } else if (typeof moduleConfig.serverFetchOptions === 'object') {
    return moduleConfig.serverFetchOptions
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
