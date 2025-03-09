import type { FetchOptions, FetchContext } from 'ofetch'
import type {
  GraphqlMiddlewareResponseUnion,
  GraphqlResponse,
} from '#nuxt-graphql-middleware/response'

export type OperationResponseError = {
  operation: string
  operationName: string
  errors: GraphqlResponseError[]
  stack?: string
}

export type GraphqlResponseErrorLocation = {
  line: number
  column: number
}

export type GraphqlResponseError = {
  message: string
  locations: GraphqlResponseErrorLocation[]
  path: string[]
  extensions?: Record<string, unknown>
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
  /**
   * Allow caching on the client.
   *
   * Caching is only enabled when `clientCache.enabled` is set to `true` in the module options.
   */
  client?: boolean
}

export type ContextType = { [key: string]: string | null | undefined }

export type GraphqlClientOptions<T extends ContextType = ContextType> = {
  /**
   * Build the client context for this request.
   *
   * The method should return an object whose properties and values are strings.
   * This object will be encoded as a query param when making the request to
   * the GraphQL middleware. Each property name is prefixed when converted to a
   * query param to prevent collisions.
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
   *   buildClientContext() {
   *     // Pass the current language as context.
   *     const language = useCurrentLanguage()
   *     return {
   *       language: language.value,
   *     }
   *   },
   * })
   * ```
   *
   * Now when a GraphQL query is made with useGraphqlQuery the request URL will
   * look like this:
   * `/api/graphql_middleware/myQuery?queryVariable=foo&__gqlc_language=en`
   *                                                   ^ your context
   *
   * Then in your serverOptions file, you can then access the context:
   *
   * ```typescript
   * export default defineGraphqlServerOptions({
   *   graphqlEndpoint(event, operation, operationName, context) {
   *     const language = context?.client?.language || 'en'
   *     return `http://backend_server/${language}/graphql`
   *    },
   * })
   * ```
   */
  buildClientContext?: () => T
}
