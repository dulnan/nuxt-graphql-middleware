import type { FetchOptions, FetchContext } from 'ofetch'
import type { GraphqlResponse } from '#graphql-middleware-server-options-build'
import type { GraphqlMiddlewareResponseUnion } from '#build/nuxt-graphql-middleware'

export type GraphqlResponseErrorLocation = {
  line: number
  column: number
}

export type GraphqlResponseError = {
  message: string
  locations: GraphqlResponseErrorLocation[]
  path: string[]
}

// Type for the query or mutation responses.
export type GraphqlServerResponse<T> = {
  data: T
  errors: GraphqlResponseError[]
}

export interface GraphqlMiddlewareState {
  fetchOptions: Omit<FetchOptions<'json'>, 'onResponse'> & {
    onResponse?: (
      context: FetchContext<GraphqlResponse<GraphqlMiddlewareResponseUnion>>,
    ) => void | Promise<void>
  }
}

export type RequestCacheOptions = {
  client?: boolean
}

type ContextType = { [key: string]: string | null | undefined }

export type BaseGraphqlClientOptions<T extends ContextType = ContextType> = {
  getContext?: () => T
}
