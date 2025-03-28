import {
  defineEventHandler,
  readMultipartFormData,
  getQuery,
  type MultiPartData,
  getRouterParam,
} from 'h3'
import type { FetchError } from 'ofetch'
import {
  getEndpoint,
  getFetchOptions,
  onServerResponse,
  onServerError,
  throwError,
  extractRequestContext,
  isValidMutation,
} from './../helpers'
import { documents } from '#nuxt-graphql-middleware/documents'
import { serverOptions } from '#nuxt-graphql-middleware/server-options'
import { useRuntimeConfig } from '#imports'
import { GraphqlMiddlewareOperation } from '../../settings'

type GraphqlUploadData = {
  variables: Record<string, any>
  map: string
  files: MultiPartData[]
}

function parseMultipart(data: MultiPartData[]): GraphqlUploadData {
  const files: MultiPartData[] = data.filter((v) => !!v.filename)

  const variablesData = data
    .find((v) => v.name === 'variables')
    ?.data?.toString()
  if (!variablesData) {
    throw new Error('Missing variables in form data.')
  }
  const variables = JSON.parse(variablesData)
  const map = data.find((v) => v.name === 'map')?.data.toString() || '{}'

  return { files, map, variables }
}

export default defineEventHandler(async (event) => {
  const operation = GraphqlMiddlewareOperation.Mutation
  const operationName = getRouterParam(event, 'name')

  if (!isValidMutation(operationName)) {
    return throwError('Invalid mutation name.')
  }

  // The GraphQL query document as a string.
  const operationDocument = documents.mutation[operationName]

  const multiPartData = await readMultipartFormData(event)

  if (!multiPartData) {
    return throwError('Failed to read multi part data.')
  }

  const { variables, map, files } = parseMultipart(multiPartData)

  // Build a new FormData object.
  const formData = new FormData()

  // Add the operations.
  formData.append(
    'operations',
    JSON.stringify({
      query: operationDocument,
      variables,
      operationName,
    }),
  )

  formData.append('map', map)

  for (const file of files) {
    if (!file.name) {
      return throwError('Missing name for file: ' + file.filename)
    }
    const blob = new Blob([file.data])
    formData.append(file.name, blob, file.filename)
  }

  const queryParams = getQuery(event)
  const context = extractRequestContext(queryParams)

  // If a custom request method is provided run it.
  if (serverOptions.doGraphqlRequest) {
    return serverOptions.doGraphqlRequest({
      event,
      operation,
      operationName,
      operationDocument,
      variables,
      formData,
      context,
    })
  }

  // Get the runtime config.
  const runtimeConfig = useRuntimeConfig().graphqlMiddleware

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
      ...fetchOptions,
      method: 'POST',
      body: formData,
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
    .catch((error: FetchError) => {
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
