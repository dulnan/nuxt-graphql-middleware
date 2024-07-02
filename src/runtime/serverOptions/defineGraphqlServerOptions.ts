import { type GraphqlMiddlewareServerOptions } from './../../types'

export function defineGraphqlServerOptions<T extends object>(
  options: GraphqlMiddlewareServerOptions<T>,
) {
  return options
}
