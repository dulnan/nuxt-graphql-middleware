import type { BaseGraphqlClientOptions } from './../types'

export function defineGraphqlClientOptions<T extends BaseGraphqlClientOptions>(
  options: T,
): T {
  return options
}
