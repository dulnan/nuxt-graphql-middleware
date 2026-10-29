import {
  defineEventHandler,
  getQuery,
  getRouterParam,
  getRequestHeader,
} from 'h3'
import type { FetchError } from 'ofetch'
import {
  getEndpoint,
  getFetchOptions,
  withSignal,
  onServerResponse,
  onServerError,
  throwError,
  extractRequestContext,
  isValidMutation,
  readMultipartBody,
} from './../helpers'
import { documents } from '#nuxt-graphql-middleware/documents'
import { uploadMutations } from '#nuxt-graphql-middleware/upload-mutations'
import { serverOptions } from '#nuxt-graphql-middleware/server-options'
import { useRuntimeConfig } from '#imports'
import { GraphqlMiddlewareOperation, UPLOAD_HEADER } from '../../settings'

type GraphqlUploadData = {
  variables: Record<string, any>
  map: string
  files: [name: string, file: File][]
}

function parseFormData(data: FormData): GraphqlUploadData {
  const variablesData = data.get('variables')
  if (typeof variablesData !== 'string') {
    return throwError('Missing variables in form data.')
  }

  let variables: unknown
  try {
    variables = JSON.parse(variablesData)
  } catch {
    return throwError('Invalid variables in form data.')
  }
  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
    return throwError('Invalid variables in form data.')
  }

  const mapData = data.get('map')
  const map = typeof mapData === 'string' ? mapData : '{}'

  const files: [string, File][] = []
  for (const [name, value] of data) {
    if (typeof value !== 'string') {
      files.push([name, value])
    }
  }

  return { files, map, variables: variables as Record<string, any> }
}

export default defineEventHandler(async (event) => {
  const operation = GraphqlMiddlewareOperation.Mutation
  const operationName = getRouterParam(event, 'name')

  if (!isValidMutation(operationName)) {
    return throwError('Invalid mutation name.')
  }

  // Only mutations with file variables can use the higher body size limit of
  // this route.
  if (!uploadMutations.includes(operationName)) {
    return throwError(
      `The mutation "${operationName}" has no file variables. Use the mutation endpoint instead.`,
    )
  }

  if (!getRequestHeader(event, UPLOAD_HEADER)) {
    return throwError(`Missing "${UPLOAD_HEADER}" header.`)
  }

  // The GraphQL query document as a string.
  const operationDocument = documents.mutation[operationName]

  // Get the runtime config.
  const runtimeConfig = useRuntimeConfig().graphqlMiddleware

  const multiPartData = await readMultipartBody(
    event,
    runtimeConfig.bodySizeLimit?.upload,
  )

  const { variables, map, files } = parseFormData(multiPartData)

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

  for (const [name, file] of files) {
    if (!name) {
      return throwError('Missing name for file: ' + file.name)
    }

    formData.append(name, file, file.name)
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
  const fetchOptions = withSignal(
    await getFetchOptions(
      serverOptions,
      event,
      operation,
      operationName,
      context,
    ),
    runtimeConfig.graphqlServerTimeout,
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
