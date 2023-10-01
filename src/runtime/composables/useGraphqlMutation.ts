import {
  GraphqlMiddlewareMutationName,
  GetMutationArgs,
  MutationObjectArgs,
  GetMutationResult,
} from './shared'
import { performRequest } from './nuxtApp'
import type { GraphqlMiddlewareMutation } from '#build/nuxt-graphql-middleware'

/**
 * Performs a GraphQL mutation.
 */
export function useGraphqlMutation<T extends GraphqlMiddlewareMutationName>(
  ...args:
    | GetMutationArgs<T, GraphqlMiddlewareMutation>
    | [MutationObjectArgs<T, GraphqlMiddlewareMutation>]
): Promise<GetMutationResult<T, GraphqlMiddlewareMutation>> {
  const [name, body, fetchOptions = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1]]
      : [args[0].name, args[0].variables, args[0].fetchOptions]

  return performRequest('mutation', name, 'post', {
    body,
    ...fetchOptions,
  }) as Promise<GetMutationResult<T, GraphqlMiddlewareMutation>>
}
