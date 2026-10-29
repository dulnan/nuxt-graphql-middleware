export enum GraphqlMiddlewareOperation {
  Query = 'query',
  Mutation = 'mutation',
}

export const CLIENT_CONTEXT_PREFIX = '__gqlc_'
export const OPERATION_HASH_PREFIX = '__gqlh'

/**
 * The header the upload route requires.
 *
 * Unlike JSON, a multipart body can be sent by browsers from other origins
 * without a CORS preflight. Custom headers can only be sent after one, which
 * the middleware doesn't answer.
 */
export const UPLOAD_HEADER = 'x-nuxt-graphql-middleware-upload'

/**
 * The key of the page request in the fetch context of queries performed
 * during SSR.
 */
export const SSR_EVENT_KEY = '__nuxtGraphqlMiddlewareSsrEvent'
