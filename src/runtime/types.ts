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

export type ContextType = { [key: string]: string | null | undefined }

export type GraphqlClientOptions<T extends ContextType = ContextType> = {
  /**
   * Build the client context for this request.
   *
   * The method should return an object whose properties and values are strings.
   * This object will be encoded as a query param when making the request to
   * the GraphQL middleware. Each property is prefixed in the request to
   * prevent collisions with query variables.
   *
   * On the server, the context is reassembled and passed to methods in custom
   * server options such as getEndpoint or serverFetchOptions.
   *
   * One use case would be to pass some state of the Nuxt app to your server
   * options such as the current language.
   *
   * @example
   * Define a context.
   *
   * ```typescript
   * export default defineGraphqlClientOptions({
   *   getContext() {
   *     const language = useCurrentLanguage()
   *     return {
   *       language: language.value,
   *     }
   *   },
   * })
   * ```
   */
  getContext?: () => T
}
