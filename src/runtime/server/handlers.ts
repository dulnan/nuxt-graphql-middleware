import type { QueryObject } from 'ufo'
import type { H3Event } from 'h3'
import type { FetchOptions, FetchResponse } from 'ofetch'
import { serverOptions } from '#nuxt-graphql-middleware/server-options'
import { documents } from '#nuxt-graphql-middleware/documents'
import { operationVariables } from '#nuxt-graphql-middleware/operation-variables'
import { uploadMutations } from '#nuxt-graphql-middleware/upload-mutations'
import type { GraphqlMiddlewareRequestContext } from '../types'
import { GraphqlMiddlewareOperation, UPLOAD_HEADER } from '../settings'
import { decodeVariables } from '../helpers/queryEncoding'
import {
  dropPrototypeKeys,
  extractRequestContext,
  getBodySizeLimit,
  getEndpoint,
  getFetchOptions,
  isValidMutation,
  isValidQuery,
  withSignal,
  type createHelpers,
} from './helpers/shared'

export type RequestBody = {
  query: string
  variables?: Record<string, any>
  operation?: GraphqlMiddlewareOperation
  operationName?: string
}

type GraphqlUploadData = {
  variables: Record<string, any>
  files: [paths: string[], file: File][]
}

/**
 * The functions of the server API that the handlers call, and the helpers
 * created with them.
 */
export type HandlerApi<E> = ReturnType<typeof createHelpers<E>> & {
  getQuery: (event: E) => QueryObject
  getRouterParam: (event: E, name: string) => string | undefined
  getRequestHeader: (event: E, name: string) => string | undefined
  getClientAbortSignal: (event: E) => AbortSignal | undefined
  useRuntimeConfig: () => Record<string, any>
  fetchRaw: (url: string, options: FetchOptions) => Promise<FetchResponse<any>>
}

function parseJsonObject(
  throwError: (statusMessage: string) => never,
  value: unknown,
  name: string,
): Record<string, any> {
  let result: unknown
  try {
    result =
      typeof value === 'string' ? JSON.parse(value, dropPrototypeKeys) : null
  } catch {
    // Handled below.
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return throwError(`Missing or invalid ${name} in form data.`)
  }
  return result as Record<string, any>
}

/**
 * Whether the value at the path in the variables is null, the placeholder for
 * a file.
 */
function isFilePlaceholder(
  variables: Record<string, any>,
  path: string[],
): boolean {
  let value: unknown = variables
  for (const key of path) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) {
      return false
    }
    value = (value as Record<string, unknown>)[key]
  }
  return value === null
}

/**
 * Get the variables and the files from the form data.
 *
 * The map assigns every file one or more paths in the variables, for example
 * { "0": ["variables.file"] }. Only files in the map are accepted, and only
 * for paths that have null as the value in the variables. Every path can only
 * be assigned once.
 */
function parseFormData(
  throwError: (statusMessage: string) => never,
  data: FormData,
): GraphqlUploadData {
  const variables = parseJsonObject(
    throwError,
    data.get('variables'),
    'variables',
  )
  const map = parseJsonObject(throwError, data.get('map'), 'map')

  const files: [string[], File][] = []
  const assignedPaths = new Set<string>()
  for (const [key, paths] of Object.entries(map)) {
    const values = data.getAll(key)
    const file = values[0]
    if (values.length !== 1 || typeof file === 'string' || !file) {
      return throwError('Invalid file in form data.')
    }

    if (!Array.isArray(paths) || !paths.length) {
      return throwError('Invalid map in form data.')
    }

    for (const path of paths) {
      const [prefix, ...variablePath] =
        typeof path === 'string' ? path.split('.') : []
      if (
        prefix !== 'variables' ||
        !variablePath.length ||
        !isFilePlaceholder(variables, variablePath) ||
        assignedPaths.has(path)
      ) {
        return throwError('Invalid map in form data.')
      }
      assignedPaths.add(path)
    }

    files.push([paths, file])
  }

  for (const [key, value] of data) {
    if (typeof value !== 'string' && !Object.hasOwn(map, key)) {
      return throwError('Invalid file in form data.')
    }
  }

  return { variables, files }
}

/**
 * Build the form data for the GraphQL server.
 *
 * No field names from the request are used, so that the request can't contain
 * any other fields, such as a second "operations" field.
 */
function buildFormData(
  operationName: string,
  operationDocument: string,
  { variables, files }: GraphqlUploadData,
): FormData {
  const formData = new FormData()
  formData.append(
    'operations',
    JSON.stringify({ query: operationDocument, variables, operationName }),
  )

  const map: Record<string, string[]> = {}
  files.forEach(([paths], index) => {
    map[index] = paths
  })
  formData.append('map', JSON.stringify(map))

  files.forEach(([, file], index) => {
    // A file without a name would be sent as a text field.
    formData.append(String(index), file, file.name || 'blob')
  })

  return formData
}

/**
 * Create the server handlers for the server API.
 *
 * The server options are typed with the h3 v1 event, so the event is passed to
 * them as one.
 */
export function createHandlers<E>(api: HandlerApi<E>) {
  /**
   * Send the request to the GraphQL server.
   *
   * For file uploads, the form data is sent instead of the JSON body.
   */
  async function sendGraphqlRequest(
    event: E,
    body: RequestBody,
    context: GraphqlMiddlewareRequestContext | null,
    formData?: FormData,
  ) {
    const h3Event = event as unknown as H3Event
    if (serverOptions.doGraphqlRequest) {
      return serverOptions.doGraphqlRequest({
        event: h3Event,
        operation: body.operation,
        operationName: body.operationName,
        operationDocument: body.query,
        variables: body.variables || {},
        formData,
        context: context || {},
      })
    }

    const operation = body.operation || null
    const operationName = body.operationName || null

    // Get the runtime config.
    const runtimeConfig = api.useRuntimeConfig().graphqlMiddleware

    // Determine the endpoint of the GraphQL server.
    const endpoint = await getEndpoint(
      runtimeConfig,
      serverOptions,
      h3Event,
      operation,
      operationName,
      context || null,
    )

    // Get the fetch options for this request.
    const { fetchOptions, done } = withSignal(
      await getFetchOptions(
        serverOptions,
        h3Event,
        operation,
        operationName,
        context,
      ),
      runtimeConfig.graphqlServerTimeout,
      // Queries are aborted when the client closes the connection. Mutations
      // are left to finish: Some GraphQL servers stop halfway if the connection
      // is closed.
      operation === GraphqlMiddlewareOperation.Query
        ? api.getClientAbortSignal(event)
        : undefined,
    )

    return api
      .fetchRaw(endpoint, {
        method: 'POST',
        body: formData ?? {
          query: body.query,
          variables: body.variables,
          operationName: body.operationName,
        },
        ...fetchOptions,
      })
      .then((response) => {
        return api.onServerResponse(
          serverOptions,
          event,
          response,
          operation,
          operationName,
          context,
        )
      })
      .catch((error) => {
        return api.onServerError(
          serverOptions,
          event,
          error,
          operation,
          operationName,
          context,
        )
      })
      .finally(done)
  }

  async function query(event: E) {
    const operationName = api.getRouterParam(event, 'name')

    if (!isValidQuery(operationName)) {
      return api.throwError('Invalid query name.')
    }

    const operationDocument = documents.query[operationName]
    const queryParams = api.getQuery(event)
    const context = extractRequestContext(queryParams)
    const validVariableKeys = operationVariables[operationName]
    const variables = decodeVariables(queryParams, validVariableKeys)

    return sendGraphqlRequest(
      event,
      {
        query: operationDocument,
        variables,
        operation: GraphqlMiddlewareOperation.Query,
        operationName,
      },
      context,
    )
  }

  async function mutation(event: E) {
    const operationName = api.getRouterParam(event, 'name')
    if (!isValidMutation(operationName)) {
      return api.throwError('Invalid mutation name.')
    }

    const operationDocument = documents.mutation[operationName]
    const queryParams = api.getQuery(event)
    const context = extractRequestContext(queryParams)
    const variables = await api.readJsonBody(
      event,
      getBodySizeLimit(
        api.useRuntimeConfig().graphqlMiddleware.bodySizeLimit,
        'mutation',
      ),
    )

    return sendGraphqlRequest(
      event,
      {
        query: operationDocument,
        variables,
        operation: GraphqlMiddlewareOperation.Mutation,
        operationName,
      },
      context,
    )
  }

  async function upload(event: E) {
    const operationName = api.getRouterParam(event, 'name')

    if (!isValidMutation(operationName)) {
      return api.throwError('Invalid mutation name.')
    }

    // Only mutations with file variables can use the higher body size limit of
    // this route.
    if (!uploadMutations.includes(operationName)) {
      return api.throwError(
        `The mutation "${operationName}" has no file variables. Use the mutation endpoint instead.`,
      )
    }

    if (!api.getRequestHeader(event, UPLOAD_HEADER)) {
      return api.throwError(`Missing "${UPLOAD_HEADER}" header.`)
    }

    const multiPartData = await api.readMultipartBody(
      event,
      getBodySizeLimit(
        api.useRuntimeConfig().graphqlMiddleware.bodySizeLimit,
        'upload',
      ),
    )

    const data = parseFormData(api.throwError, multiPartData)
    const operationDocument = documents.mutation[operationName]

    return sendGraphqlRequest(
      event,
      {
        query: operationDocument,
        variables: data.variables,
        operation: GraphqlMiddlewareOperation.Mutation,
        operationName,
      },
      extractRequestContext(api.getQuery(event)),
      buildFormData(operationName, operationDocument, data),
    )
  }

  async function doRequest(event: E) {
    const body = await api.readJsonBody(
      event,
      getBodySizeLimit(
        api.useRuntimeConfig().graphqlMiddleware.bodySizeLimit,
        'mutation',
      ),
    )

    const { document, variables, operationName } = body || {}

    if (!document || typeof document !== 'string') {
      return {
        data: null,
        errors: [{ message: 'Missing or invalid document' }],
      }
    }

    return sendGraphqlRequest(
      event,
      {
        query: document,
        variables: variables || {},
        operationName: operationName || undefined,
      },
      null,
    )
  }

  return { sendGraphqlRequest, query, mutation, upload, doRequest }
}
