import type { H3Event } from 'h3'
import type { FetchOptions, FetchResponse, FetchError } from 'ofetch'
import type { GraphQLError } from 'graphql'

export type GraphqlMiddlewareGraphqlEndpointMethod = (
  event?: H3Event,
  operation?: string,
  operationName?: string,
) => string | Promise<string> | void

export type GraphqlMiddlewareServerFetchOptionsMethod = (
  event?: H3Event,
  operation?: string,
  operationName?: string,
) => FetchOptions | Promise<FetchOptions>

export type GraphqlMiddlewareOnServerResponseMethod = (
  event: H3Event,
  response: FetchResponse<any>,
  operation?: string,
  operationName?: string,
) => any | Promise<any>

export type GraphqlMiddlewareOnServerErrorMethod = (
  event: H3Event,
  error: FetchError,
  operation?: string,
  operationName?: string,
) => any | Promise<any>

/**
 * Configuration options during runtime.
 */
export type GraphqlMiddlewareServerOptions = {
  /**
   * Custom callback to return the GraphQL endpoint per request.
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
  onServerResponse?: GraphqlMiddlewareOnServerResponseMethod

  /**
   * Handle a fetch error from the GraphQL request.
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
}

export interface GraphqlMiddlewareState {
  fetchOptions: FetchOptions
}

export type GraphqlMiddlewareDocument = {
  content: string
  isValid?: boolean
  errors?: GraphQLError[]
  filename?: string
  name?: string
  operation?: string
}

export type GraphqlMiddlewareRuntimeConfig = {
  graphqlEndpoint?: string
}
