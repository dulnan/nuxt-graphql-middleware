import type { FetchOptions } from 'ofetch'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'

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
    // Make sure we get at least "data" and "errors" properties in the end.
    return Object.assign({}, v, {
      data: v?.data,
      errors: v?.errors ?? [],
    })
  })
}
