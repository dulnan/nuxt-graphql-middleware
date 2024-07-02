import { type GraphqlMiddlewareServerOptions } from './../../types'

export function defineGraphqlServerOptions<T extends {}>(
  options: GraphqlMiddlewareServerOptions<T>,
) {
  return options
}
