import {
  type GraphqlMiddlewareMutationName,
  type GetMutationArgs,
  type MutationObjectArgs,
  type GetMutationResult,
  encodeContext,
} from './shared'
import { performRequest } from './nuxtApp'
import { clientOptions } from '#graphql-middleware-client-options'
import type { GraphqlMiddlewareMutation } from '#build/nuxt-graphql-middleware'
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'

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
  const [name, body, fetchOptions = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1], args[2]?.fetchOptions]
      : [args[0].name, args[0].variables, args[0].fetchOptions]

  const clientContext = clientOptions.buildClientContext
    ? encodeContext(clientOptions.buildClientContext())
    : {}

  return performRequest<R>('mutation', name, 'post', {
    body,
    params: {
      ...clientContext,
    },
    ...fetchOptions,
  })
}
