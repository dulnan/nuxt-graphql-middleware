import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import {
  type GetQueryArgs,
  type QueryObjectArgs,
  type GetQueryResult,
  encodeContext,
} from './../../helpers/shared-types'
import { encodeVariables } from './../../helpers/queryEncoding'
import { performRequest } from '.'
import type { Query } from '#nuxt-graphql-middleware/operation-types'

/**
 * Performs a GraphQL query.
 */
export function useGraphqlQuery<
  K extends keyof Query,
  R extends GetQueryResult<K>,
>(
  ...args: GetQueryArgs<K> | [QueryObjectArgs<K>]
): Promise<GraphqlResponse<R>> {
  const [name, variables, fetchOptions = {}, clientContext = {}] =
    typeof args[0] === 'string'
      ? [args[0], args[1], args[2]?.fetchOptions, args[2]?.clientContext]
      : [
          args[0].name,
          args[0].variables,
          args[0].fetchOptions,
          args[0].clientContext,
        ]

  return performRequest<R>('query', name, 'get', {
    ...fetchOptions,
    params: {
      ...(fetchOptions.params || {}),
      ...encodeVariables(variables),
      ...encodeContext(clientContext),
    },
  })
}
