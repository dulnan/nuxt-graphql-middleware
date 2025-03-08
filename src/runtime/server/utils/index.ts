import type { FetchOptions } from 'ofetch'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { getEndpoint } from './../../helpers/composables'

export function performRequest<T>(
  operation: string,
  operationName: string,
  method: 'get' | 'post',
  options: FetchOptions,
): Promise<GraphqlResponse<T>> {
  return $fetch<GraphqlResponse<T>>(getEndpoint(operation, operationName), {
    ...options,
    method,
  }).then((v) => {
    return {
      data: v.data,
      errors: v.errors || [],
    }
  })
}
