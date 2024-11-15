import {
  type GraphqlMiddlewareMutationName,
  type GetMutationArgs,
  type MutationObjectArgs,
  type GetMutationResult,
  getEndpoint,
  encodeContext,
} from './shared'
import type { GraphqlMiddlewareMutation } from '#nuxt-graphql-middleware/generated-types'
import { clientOptions } from '#graphql-middleware-client-options'
import { useGraphqlState } from '#imports'
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'

/**
 * Builds the form data.
 */
function createFormData(variables: Record<string, any>): FormData {
  const formData = new FormData()
  formData.append('operations', '{}')
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
  T extends GraphqlMiddlewareMutationName,
  R extends GetMutationResult<T, GraphqlMiddlewareMutation>,
>(
  ...args:
    | GetMutationArgs<T, GraphqlMiddlewareMutation>
    | [MutationObjectArgs<T, GraphqlMiddlewareMutation>]
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

  const globalClientContext = clientOptions.buildClientContext
    ? encodeContext(clientOptions.buildClientContext())
    : {}

  const clientContext = {
    ...globalClientContext,
    ...overrideClientContext,
  }
  return $fetch<GraphqlResponse<R>>(getEndpoint('upload', name), {
    ...(state && state.fetchOptions ? (state.fetchOptions as any) : {}),
    ...(fetchOptions || {}),
    params: {
      ...clientContext,
    },
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
