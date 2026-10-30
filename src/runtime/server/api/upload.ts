import {
  defineEventHandler,
  getQuery,
  getRouterParam,
  getRequestHeader,
} from 'h3'
import {
  dropPrototypeKeys,
  throwError,
  extractRequestContext,
  isValidMutation,
  readMultipartBody,
} from './../helpers'
import { documents } from '#nuxt-graphql-middleware/documents'
import { uploadMutations } from '#nuxt-graphql-middleware/upload-mutations'
import { sendGraphqlRequest } from '../utils/doGraphqlRequest'
import { useRuntimeConfig } from '#imports'
import { GraphqlMiddlewareOperation, UPLOAD_HEADER } from '../../settings'

type GraphqlUploadData = {
  variables: Record<string, any>
  files: [path: string, file: File][]
}

function parseJsonObject(value: unknown, name: string): Record<string, any> {
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
 * The map assigns every file a path in the variables, for example
 * { "0": ["variables.file"] }. Only files in the map are accepted, and only
 * for paths that have null as the value in the variables.
 */
function parseFormData(data: FormData): GraphqlUploadData {
  const variables = parseJsonObject(data.get('variables'), 'variables')
  const map = parseJsonObject(data.get('map'), 'map')

  const files: [string, File][] = []
  for (const [key, paths] of Object.entries(map)) {
    const values = data.getAll(key)
    const file = values[0]
    if (values.length !== 1 || typeof file === 'string' || !file) {
      return throwError('Invalid file in form data.')
    }

    const path = Array.isArray(paths) && paths.length === 1 ? paths[0] : null
    const [prefix, ...variablePath] =
      typeof path === 'string' ? path.split('.') : []
    if (
      prefix !== 'variables' ||
      !variablePath.length ||
      !isFilePlaceholder(variables, variablePath)
    ) {
      return throwError('Invalid map in form data.')
    }

    files.push([path, file])
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
  files.forEach(([path], index) => {
    map[index] = [path]
  })
  formData.append('map', JSON.stringify(map))

  files.forEach(([, file], index) => {
    // A file without a name would be sent as a text field.
    formData.append(String(index), file, file.name || 'blob')
  })

  return formData
}

export default defineEventHandler(async (event) => {
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

  const multiPartData = await readMultipartBody(
    event,
    useRuntimeConfig().graphqlMiddleware.bodySizeLimit?.upload,
  )

  const data = parseFormData(multiPartData)
  const operationDocument = documents.mutation[operationName]

  return sendGraphqlRequest(
    event,
    {
      query: operationDocument,
      variables: data.variables,
      operation: GraphqlMiddlewareOperation.Mutation,
      operationName,
    },
    extractRequestContext(getQuery(event)),
    buildFormData(operationName, operationDocument, data),
  )
})
