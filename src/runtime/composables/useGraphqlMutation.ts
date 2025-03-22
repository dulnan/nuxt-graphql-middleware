import {
  type GetMutationArgs,
  type MutationObjectArgs,
  type GetMutationResult,
  encodeContext,
} from './../helpers/composables'
import { performRequest } from './nuxtApp'
import { clientOptions } from '#nuxt-graphql-middleware/client-options'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
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
