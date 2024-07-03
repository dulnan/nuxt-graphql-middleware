import type { H3Event } from 'h3'
import type { FetchOptions, FetchResponse, FetchError } from 'ofetch'
import type { GraphQLError } from 'graphql'
import type { GraphqlServerResponse } from '#graphql-middleware/types'
import type { GraphqlMiddlewareResponseUnion } from '#build/nuxt-graphql-middleware'

export type GraphqlMiddlewareGraphqlEndpointMethod = (
  event?: H3Event,
  operation?: string,
  operationName?: string,
) => string | Promise<string> | undefined

export type GraphqlMiddlewareServerFetchOptionsMethod = (
  event?: H3Event,
  operation?: string,
  operationName?: string,
) => FetchOptions | Promise<FetchOptions>

export type GraphqlMiddlewareOnServerResponseMethod<ServerReponse, T> = (
  event: H3Event,
  response: FetchResponse<ServerReponse>,
  operation?: string,
  operationName?: string,
) => T | Promise<T>

export type GraphqlMiddlewareOnServerErrorMethod = (
  event: H3Event,
  error: FetchError,
  operation?: string,
  operationName?: string,
) => any | Promise<any>

export type GraphqlMiddlewareDoRequestMethodContext = {
  /**
   * The incoming request event from H3.
   */
  event: H3Event

  /**
   * The type of operation.
   */
  operation: 'query' | 'mutation'

  /**
   * The name of the operation.
   */
  operationName: string

  /**
   * The operation document (the raw GraphQL query/mutation as a string).
   */
  operationDocument: string

  /**
   * Variables for the operation.
   */
  variables: Record<string, any>

  /**
   * For file uploads (which are done using FormData), this contains the full
   * form data with these keys:
   *
   * - operations: string
   *   A JSON string of an object with "query", "variables" and "operationName" properties.
   *   Example:
   *   operations='{ "query": "mutation ($id: String!, $file: Upload!) { uploadFile(id: $id, file: $file) { id filename } }", "variables": { "file": null, "id": "1" } }'
   * - map: string
   *   A JSON string of an object whose keys are strings starting at '0' and the values being an array with a single string:
   *   Example:
   *   map='{ "0": ["variables.file"] }'
   * - [number]
   *   For every file there is a FormData entry with a name that matches the key in `map`.
   *   Example:
   *   0=[Binary File]
   */
  formData?: FormData
}

export type GraphqlMiddlewareDoRequestMethod<T> = (
  context: GraphqlMiddlewareDoRequestMethodContext,
) => Promise<T>

/**
 * Configuration options during runtime.
 */
export type GraphqlMiddlewareServerOptions<
  Additions extends object = object,
  CustomResponse = GraphqlServerResponse<GraphqlMiddlewareResponseUnion> &
    Additions,
> = {
  /**
   * Custom callback to return the GraphQL endpoint per request.
   *
   * The method is only called if no `doGraphqlRequest` method is implemented.
   *
   * @default undefined
   *
   * @example
   * ```ts
   * function graphqlEndpoint(event, operation, operationName) {
   *   const language = getLanguageFromRequest(event)
   *   return `https://api.example.com/${language}/graphql`
   * }
   * ```
   */
  graphqlEndpoint?: GraphqlMiddlewareGraphqlEndpointMethod

  /**
   * Provide the options for the ofetch request to the GraphQL server.
   *
   * The method is only called if no `doGraphqlRequest` method is implemented.
   *
   * @default undefined
   *
   * @example
   * ```ts
   * import { getHeader } from 'h3'
   *
   * // Pass the cookie from the client request to the GraphQL request.
   * function serverFetchOptions(event, operation, operationName) {
   *   return {
   *     headers: {
   *       Cookie: getHeader(event, 'cookie')
   *     }
   *   }
   * }
   * ```
   */
  serverFetchOptions?: GraphqlMiddlewareServerFetchOptionsMethod

  /**
   * Handle the response from the GraphQL server.
   *
   * The method is only called if no `doGraphqlRequest` method is implemented.
   *
   * You can alter the response, add additional properties to the data, get
   * and set headers, etc.
   *
   * ```ts
   * import type { H3Event } from 'h3'
   * import type { FetchResponse } from 'ofetch'
   *
   * function onServerResponse(event: H3Event, graphqlResponse: FetchResponse) {
   *   // Set a static header.
   *   event.node.res.setHeader('x-nuxt-custom-header', 'A custom header value')
   *
   *   // Pass the set-cookie header from the GraphQL response to the client.
   *   const setCookie = graphqlResponse.headers.get('set-cookie')
   *   if (setCookie) {
   *     event.node.res.setHeader('set-cookie', setCookie)
   *   }
   *
   *   // Add additional properties to the response.
   *   graphqlResponse._data.__customProperty = ['My', 'values']
   *
   *   // Return the GraphQL response.
   *   return graphqlResponse._data
   * }
   * ```
   */
  onServerResponse?: GraphqlMiddlewareOnServerResponseMethod<
    GraphqlServerResponse<GraphqlMiddlewareResponseUnion>,
    CustomResponse
  >

  /**
   * Handle a fetch error from the GraphQL request.
   *
   * The method is only called if no `doGraphqlRequest` method is implemented.
   *
   * Note that errors are only thrown for responses that are not status
   * 200-299. See https://github.com/unjs/ofetch#%EF%B8%8F-handling-errors for
   * more information.
   *
   * ```ts
   * import { createError } from 'h3'
   * import type { H3Event } from 'h3'
   * import type { FetchError } from 'ofetch'
   *
   * function onServerError(
   *   event: H3Event,
   *   error: FetchError,
   *   operation: string,
   *   operationName: string,
   * ) {
   *   // Throw a h3 error.
   *   throw createError({
   *     statusCode: 500,
   *     statusMessage: `Couldn't execute GraphQL ${operation} "${operationName}".`,
   *     data: error.message
   *   })
   * }
   * ```
   */
  onServerError?: GraphqlMiddlewareOnServerErrorMethod

  /**
   * Provide a custom fetch method for requests to the GraphQL server.
   *
   * This can be used if onServerError, onServerResponse, serverFetchOptions
   * and graphqlEndpoint are not enough to meet your requirements.
   *
   * When this method is implemented, all other methods are not called.
   *
   * The method will be called in the /api/graphql server route and should
   * perform the GraphQL request and return the response.
   *
   * An example use case might be to handle expired tokens.
   *
   * * ```ts
   * async function doGraphqlRequest({
   *   event,
   *   operation,
   *   operationName,
   *   operationDocument,
   *   variables,
   * }) {
   *   const result = await $fetch.raw('https://example.com/graphql', {
   *     method: 'POST'
   *     body: {
   *       query: operationDocument,
   *       variables,
   *       operationName
   *     },
   *     headers: {
   *       'custom-header': 'foobar'
   *     }
   *   })
   *
   *   return result._data
   * }
   * ```
   */
  doGraphqlRequest?: GraphqlMiddlewareDoRequestMethod<CustomResponse>
}

export type GraphqlMiddlewareDocument = {
  id?: string
  content: string
  isValid?: boolean
  errors?: GraphQLError[]
  filename?: string
  relativePath?: string
  name?: string
  operation?: string
}

export type GraphqlMiddlewareRuntimeConfig = {
  graphqlEndpoint?: string
}
