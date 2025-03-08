import { defineEventHandler, getQuery, readBody } from 'h3'
import { type GraphqlMiddlewareRuntimeConfig } from '../../types'
import {
  queryParamToVariables,
  getEndpoint,
  getFetchOptions,
  validateRequest,
  onServerResponse,
  onServerError,
  extractRequestContext,
} from './helpers'
import { GraphqlMiddlewareOperation } from './../settings'
import { documents } from '#nuxt-graphql-middleware/documents'
import { serverOptions } from '#nuxt-graphql-middleware/server-options'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  // The HTTP method. Only GET and POST are supported.
  const method = event.method

  // The operation (either "query" or "mutation").
  const operation = event.context?.params
    ?.operation as GraphqlMiddlewareOperation

  // The name of the query or mutation.
  const operationName = event.context?.params?.name as string

  // Make sure the request is valid. Will throw an error if the request is
  // invalid.
  validateRequest(method, operation, operationName, documents)

  // The GraphQL query document as a string.
  const operationDocument: string = (documents as any)[operation][operationName]

  const queryParams = getQuery(event)
  const context = extractRequestContext(queryParams)

  // Get the query variables or mutation input.
  const variables =
    operation === GraphqlMiddlewareOperation.Query
      ? queryParamToVariables(queryParams)
      : await readBody(event)

  // If a custom request method is provided run it.
  if (serverOptions.doGraphqlRequest) {
    return serverOptions.doGraphqlRequest({
      event,
      operation,
      operationName,
      operationDocument,
      variables,
      context,
    })
  }

  // Get the runtime config.
  const runtimeConfig = useRuntimeConfig()
    .graphqlMiddleware as GraphqlMiddlewareRuntimeConfig

  // Determine the endpoint of the GraphQL server.
  const endpoint = await getEndpoint(
    runtimeConfig,
    serverOptions,
    event,
    operation,
    operationName,
    context,
  )

  // Get the fetch options for this request.
  const fetchOptions = await getFetchOptions(
    serverOptions,
    event,
    operation,
    operationName,
    context,
  )

  return $fetch
    .raw(endpoint, {
      // @todo: Remove any once https://github.com/unjs/nitro/pull/883 is released.
      method: 'POST' as any,
      body: {
        query: operationDocument,
        variables,
        operationName,
      },
      ...fetchOptions,
    })
    .then((response) => {
      return onServerResponse(
        serverOptions,
        event,
        response,
        operation,
        operationName,
        context,
      )
    })
    .catch((error) => {
      return onServerError(
        serverOptions,
        event,
        error,
        operation,
        operationName,
        context,
      )
    })
})
