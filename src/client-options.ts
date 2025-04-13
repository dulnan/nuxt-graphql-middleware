import type { GraphqlClientOptions, ContextType } from './runtime/types'

export function defineGraphqlClientOptions<T extends ContextType>(
  options: GraphqlClientOptions<T>,
): GraphqlClientOptions<T> {
  return options
}

export type { GraphqlClientOptions }
