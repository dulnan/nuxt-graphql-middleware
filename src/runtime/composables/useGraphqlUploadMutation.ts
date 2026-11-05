import {
  type GetMutationArgs,
  type MutationObjectArgs,
  type GetMutationResult,
  encodeContext,
} from './../helpers/composables'
import { clientOptions } from '#nuxt-graphql-middleware/client-options'
import { useGraphqlState } from '#imports'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import type { UploadMutationName } from '#nuxt-graphql-middleware/upload-mutations'
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'
import { UPLOAD_HEADER } from '../settings'

/**
 * Builds the form data.
 */
function createFormData(variables: Record<string, any>): FormData {
  const formData = new FormData()
  const map: Record<string, string[]> = {}
  let fileIndex = 0

  // Iterate over the variables and collect the files.
  const traverseAndBuildMap = (obj: any, path: string): any => {
    if (obj instanceof File) {
      const fileKey = `${fileIndex++}`
      map[fileKey] = [path]
      formData.append(fileKey, obj)
      return null // Replace File with null for JSON.stringify
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) =>
        traverseAndBuildMap(item, `${path}.${index}`),
      )
    }

    if (typeof obj === 'object' && obj !== null) {
      const newObj: Record<string, any> = {}
      for (const key in obj) {
        newObj[key] = traverseAndBuildMap(obj[key], `${path}.${key}`)
      }
      return newObj
    }

    return obj
  }

  const cleanedVariables = traverseAndBuildMap(variables, 'variables')

  formData.append('variables', JSON.stringify(cleanedVariables))
  formData.append('map', JSON.stringify(map))

  return formData
}

/**
 * Performs a GraphQL upload mutation.
 */
export function useGraphqlUploadMutation<
  K extends UploadMutationName,
  R extends GetMutationResult<K>,
>(
  ...args: GetMutationArgs<K> | [MutationObjectArgs<K>]
): Promise<GraphqlResponse<R>> {
  const [name, variables, fetchOptions = {}, overrideClientContext = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1], args[2]?.fetchOptions, args[2]?.clientContext]
      : [
          args[0].name,
          args[0].variables,
          args[0].fetchOptions,
          args[0].clientContext,
        ]

  if (!variables) {
    throw new Error(
      'Using "useGraphqlUploadMutation" without variables is not supported.',
    )
  }

  const state = useGraphqlState()

  const formData = createFormData(variables)

  const globalClientContext =
    clientOptions && clientOptions.buildClientContext
      ? clientOptions.buildClientContext()
      : {}

  const clientContext = encodeContext({
    ...globalClientContext,
    ...overrideClientContext,
  })

  // Like the other fetch options, headers passed to the composable replace the
  // headers from the state.
  const headers = new Headers(
    fetchOptions.headers ?? state?.fetchOptions?.headers,
  )
  headers.set(UPLOAD_HEADER, '1')

  return $fetch<GraphqlResponse<R>>(getEndpoint('upload', name), {
    ...(state && state.fetchOptions ? (state.fetchOptions as any) : {}),
    ...(fetchOptions || {}),
    params: {
      ...clientContext,
      ...(fetchOptions.params || {}),
    },
    headers: Object.fromEntries(headers),
    method: 'POST',
    body: formData,
  }).then((v) => {
    return {
      ...v,
      data: v?.data,
      errors: v?.errors || [],
    }
  })
}
