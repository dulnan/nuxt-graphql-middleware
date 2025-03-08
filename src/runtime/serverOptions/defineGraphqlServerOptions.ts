import type { GraphqlClientContext } from '#nuxt-graphql-middleware/client-options'
import { type GraphqlMiddlewareServerOptions } from './../../types'

export function defineGraphqlServerOptions<T extends object>(
  options: GraphqlMiddlewareServerOptions<T, GraphqlClientContext>,
) {
  return options
}
