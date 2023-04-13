import { defineEventHandler, getQuery, getMethod, readBody } from 'h3'
import { GraphqlMiddlewareRuntimeConfig } from '../../types'
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

export default defineEventHandler(async (event) => {
  // The HTTP method. Only GET and POST are supported.
  const method = getMethod(event)

  // The operation (either "query" or "mutation").
  const operation = event.context?.params
    ?.operation as GraphqlMiddlewareOperation

  // The name of the query or mutation.
  const name = event.context?.params?.name as string

  // Make sure the request is valid. Will throw an error if the request is
  // invalid.
  validateRequest(method, operation, name, documents)

  // The GraphQL query document as a string.
  const query: string = documents[operation][name]

  // Get the runtime config.
  const runtimeConfig = useRuntimeConfig()
    .graphqlMiddleware as GraphqlMiddlewareRuntimeConfig

  // Determine the endpoint of the GraphQL server.
  const endpoint = await getEndpoint(
    runtimeConfig,
    serverOptions,
    event,
    operation,
    name,
  )

  // Get the fetch options for this request.
  const fetchOptions = await getFetchOptions(
    serverOptions,
    event,
    operation,
    name,
  )

  // Get the query variables or mutation input.
  const variables =
    operation === GraphqlMiddlewareOperation.Query
      ? queryParamToVariables(getQuery(event) as any)
      : await readBody(event)

  return $fetch
    .raw(endpoint, {
      // @todo: Remove any once https://github.com/unjs/nitro/pull/883 is released.
      method: 'POST' as any,
      body: {
        query,
        variables,
      },
      ...fetchOptions,
    })
    .then((response) => {
      return onServerResponse(serverOptions, event, response, operation, name)
    })
    .catch((error) => {
      return onServerError(serverOptions, event, error, operation, name)
    })
})
