import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import {
  type GetMutationArgs,
  type MutationObjectArgs,
  type GetMutationResult,
  encodeContext,
} from './../../helpers/shared-types'
import { performRequest } from '.'
import type { Mutation } from '#nuxt-graphql-middleware/operation-types'

/**
 * Performs a GraphQL mutation.
 */
export function useGraphqlMutation<
  K extends keyof Mutation,
  R extends GetMutationResult<K>,
>(
  ...args: GetMutationArgs<K> | [MutationObjectArgs<K>]
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
    ...fetchOptions,
    body,
    params: {
      ...encodeContext(clientContext),
      ...(fetchOptions.params || {}),
    },
  })
}
