import type { GraphqlResponse } from '../composables/shared'
import { type GraphqlMiddlewareServerOptions } from './../../types'

export function defineGraphqlServerOptions<T extends GraphqlResponse<any>>(
  options: GraphqlMiddlewareServerOptions<T>,
) {
  return options
}
