import { promises as fsp } from 'fs'
import type { CompatibilityEvent } from 'h3'
import type { FetchOptions } from 'ohmyfetch'
import {
  defineEventHandler,
  createError,
  getQuery,
  getMethod,
  readBody,
  getHeader,
} from 'h3'
import { QueryObject } from 'ufo'
import { loadNuxtConfig } from '@nuxt/kit'
import type { GraphqlMiddlewareConfig } from './../../types'
import { useRuntimeConfig } from '#imports'
import operations from '#graphql-documents'

enum GraphqlMiddlewareOperation {
  Query = 'query',
  Mutation = 'mutation',
}

let moduleConfig: GraphqlMiddlewareConfig | null = null
function getModuleConfig(): Promise<GraphqlMiddlewareConfig> {
  if (moduleConfig) {
    return Promise.resolve(moduleConfig)
  }
  const { graphqlMiddleware } = useRuntimeConfig()
  return loadNuxtConfig({
    cwd: graphqlMiddleware.rootDir,
  }).then((v: any) => {
    moduleConfig = v.graphqlMiddleware
    return v.graphqlMiddleware
  })
}

// Get the variables from query parameters.
//
// For simple cases, e.g. when only primitive variable values are sent:
// ?path=foobar
//
// In complex cases, the entire variables are sent as a JSON encoded string:
// ?__variables=%7B%22foobar%22:%7B%22path%22:%22%22%7D%7D
function queryParamToVariables(query: QueryObject) {
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
function getEndpoint(
  moduleConfig: GraphqlMiddlewareConfig,
  event: CompatibilityEvent,
  operation: GraphqlMiddlewareOperation,
  operationName: string,
): string {
  if (typeof moduleConfig.graphqlEndpoint === 'string') {
    return moduleConfig.graphqlEndpoint
  }

  return moduleConfig.graphqlEndpoint(event, operation, operationName)
}

/**
 * Get the options for the $fetch request to the GraphQL server.
 */
function getFetchOptions(
  moduleConfig: GraphqlMiddlewareConfig,
  event: CompatibilityEvent,
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

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const operation = event.context.params.operation as GraphqlMiddlewareOperation

  // Only allow POST for /mutation/:name.
  if (method === 'POST' && operation !== GraphqlMiddlewareOperation.Mutation) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Mutations must be a POST request.',
    })
  }

  // Only allow GET for /query/:name.
  if (method === 'GET' && operation !== GraphqlMiddlewareOperation.Query) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Queries must be a GET request.',
    })
  }

  // The name of the query or mutation.
  const name = event.context.params.name
  const query = operations[operation][name]

  // Query or mutation with this name does not exist.
  if (!query) {
    throw createError({
      statusCode: 400,
      statusMessage: `Operation "${operation}" with name "${name} not found."`,
    })
  }

  const config = await getModuleConfig()
  const endpoint = getEndpoint(config, event, operation, name)
  const fetchOptions = getFetchOptions(config, event, operation, name)

  const variables =
    operation === GraphqlMiddlewareOperation.Query
      ? queryParamToVariables(getQuery(event))
      : readBody(event)

  return $fetch(endpoint, {
    method: 'POST',
    body: {
      query,
      variables,
    },
    ...fetchOptions,
  }).catch((err) => {
    throw createError({
      statusCode: 500,
      statusMessage: "Couldn't execute GraphQL query.",
      data: err && 'message' in err ? err.mess : err,
    })
  })
})
