import {
  defineEventHandler,
  createError,
  getQuery,
  getMethod,
  readBody,
} from 'h3'
import {
  queryParamToVariables,
  getEndpoint,
  getFetchOptions,
  validateRequest,
} from './helpers'
import { getModuleConfig } from './helpers/getModuleConfig'
import { GraphqlMiddlewareOperation } from './../../types'
import { documents } from '#graphql-documents'

export default defineEventHandler(async (event) => {
  // The HTTP method.
  const method = getMethod(event)

  // The operation (either "query" or "mutation").
  const operation = event.context.params.operation as GraphqlMiddlewareOperation

  // The name of the query or mutation.
  const name = event.context.params.name

  // Make sure the request is valid.
  validateRequest(method, operation, name, documents)

  // The GraphQL query document.
  const query = documents[operation][name]

  // Load the module configuration.
  const config = await getModuleConfig()

  // Determine the endpoint of the GraphQL server.
  const endpoint = getEndpoint(config, event, operation, name)

  // Get the fetch options for this request.
  const fetchOptions = getFetchOptions(config, event, operation, name)

  const variables =
    operation === GraphqlMiddlewareOperation.Query
      ? queryParamToVariables(getQuery(event) as any)
      : await readBody(event)

  return $fetch
    .raw(endpoint, {
      method: 'POST',
      body: {
        query,
        variables,
      },
      ...fetchOptions,
    })
    .then((response) => {
      if (config.onServerResponse) {
        return config.onServerResponse(event, response, operation, name)
      }
      return response._data
    })
    .catch((err) => {
      console.log(err)
      console.log(Object.keys(err))
      throw createError({
        statusCode: 500,
        statusMessage: "Couldn't execute GraphQL query.",
        data: err && 'message' in err ? err.mess : err,
      })
    })
})
