import type { GraphqlClientContext } from '#nuxt-graphql-middleware/client-options'
import type { GraphqlMiddlewareResponseUnion } from '#nuxt-graphql-middleware/response'
import type { GraphqlMiddlewareServerOptions } from './../../types'

export function defineGraphqlServerOptions<T extends object>(
  options: GraphqlMiddlewareServerOptions<
    T,
    GraphqlMiddlewareResponseUnion,
    GraphqlClientContext
  >,
) {
  return options
}
