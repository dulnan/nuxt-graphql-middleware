import {
  type GraphqlMiddlewareMutationName,
  type GetMutationArgs,
  type MutationObjectArgs,
  type GetMutationResult,
  encodeContext,
} from './../helpers/composables'
import { performRequest } from './nuxtApp'
import { clientOptions } from '#graphql-middleware-client-options'
import type { GraphqlMiddlewareMutation } from '#nuxt-graphql-middleware/generated-types'
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
  const [name, body, fetchOptions = {}, overrideClientContext = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1], args[2]?.fetchOptions, args[2]?.clientContext]
      : [
          args[0].name,
          args[0].variables,
          args[0].fetchOptions,
          args[0].clientContext,
        ]

  const globalClientContext = clientOptions.buildClientContext
    ? clientOptions.buildClientContext()
    : {}

  return performRequest<R>('mutation', name, 'post', {
    ...fetchOptions,
    body,
    params: {
      ...(fetchOptions.params || {}),
      ...encodeContext({
        ...globalClientContext,
        ...overrideClientContext,
      }),
    },
  })
}
