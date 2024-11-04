import type { GraphqlClientContext } from '#graphql-middleware-client-options'
import { type GraphqlMiddlewareServerOptions } from './../../types'

export function defineGraphqlServerOptions<T extends object>(
  options: GraphqlMiddlewareServerOptions<T, GraphqlClientContext>,
) {
  return options
}
