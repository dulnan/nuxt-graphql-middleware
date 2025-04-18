import type { GraphqlClientContext } from '#nuxt-graphql-middleware/client-options'
import type { GraphqlMiddlewareResponseUnion } from '#nuxt-graphql-middleware/response'
import type { GraphqlMiddlewareServerOptions } from './runtime/types'

export function defineGraphqlServerOptions<T extends object = object>(
  options: GraphqlMiddlewareServerOptions<
    T,
    GraphqlMiddlewareResponseUnion,
    GraphqlClientContext
  >,
) {
  return options
}

export type { GraphqlMiddlewareServerOptions }
