import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import {
  type GraphqlMiddlewareMutationName,
  type GetMutationArgs,
  type MutationObjectArgs,
  type GetMutationResult,
  encodeContext,
} from './../../helpers/composables'
import type { GraphqlMiddlewareMutation } from '#nuxt-graphql-middleware/generated-types'
import { performRequest } from '.'

/**
 * Performs a GraphQL mutation.
 */
export function useGraphqlMutation<
  T extends GraphqlMiddlewareMutationName,
  R extends GetMutationResult<T, GraphqlMiddlewareMutation>,
>(
  ...args:
    | GetMutationArgs<T, GraphqlMiddlewareMutation>
    | [MutationObjectArgs<T, GraphqlMiddlewareMutation>]
): Promise<GraphqlResponse<R>> {
  const [name, body, fetchOptions = {}, clientContext = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1], args[2]?.fetchOptions, args[2]?.clientContext]
      : [
          args[0].name,
          args[0].variables,
          args[0].fetchOptions,
          args[0].clientContext,
        ]

  return performRequest<R>('mutation', name, 'post', {
    body,
    params: encodeContext(clientContext),
    ...fetchOptions,
  })
}
