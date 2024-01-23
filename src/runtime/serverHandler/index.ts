import { defineEventHandler, getQuery, readBody } from 'h3'
import { type GraphqlMiddlewareRuntimeConfig } from '../../types'
import {
  queryParamToVariables,
  getEndpoint,
  getFetchOptions,
  validateRequest,
  onServerResponse,
  onServerError,
} from './helpers'
import { GraphqlMiddlewareOperation } from './../settings'
import { documents } from '#graphql-documents'
import serverOptions from '#graphql-middleware-server-options-build'
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
  const operationDocument: string = documents[operation][operationName]

  // Get the query variables or mutation input.
  const variables =
    operation === GraphqlMiddlewareOperation.Query
      ? queryParamToVariables(getQuery(event) as any)
      : await readBody(event)

  // If a custom request method is provided run it.
  if (serverOptions.doGraphqlRequest) {
    return serverOptions.doGraphqlRequest({
      event,
      operation,
      operationName,
      operationDocument,
      variables,
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
  )

  // Get the fetch options for this request.
  const fetchOptions = await getFetchOptions(
    serverOptions,
    event,
    operation,
    operationName,
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
      )
    })
    .catch((error) => {
      return onServerError(
        serverOptions,
        event,
        error,
        operation,
        operationName,
      )
    })
})
