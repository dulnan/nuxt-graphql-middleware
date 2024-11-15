import type { GraphqlClientOptions, ContextType } from './../types'

export function defineGraphqlClientOptions<T extends ContextType>(
  options: GraphqlClientOptions<T>,
): GraphqlClientOptions<T> {
  return options
}
