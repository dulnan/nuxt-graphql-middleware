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
 * The key of the signal for the connection of the page in the fetch context of
 * queries performed during SSR.
 */
export const SSR_ABORT_SIGNAL_KEY = '__nuxtGraphqlMiddlewareSsrAbortSignal'

/**
 * The longest timeout in milliseconds. Node fires longer timers after 1 ms.
 */
export const MAX_TIMEOUT = 2_147_483_647

/**
 * The default of the graphqlServerTimeout option, also used at runtime if the
 * runtime config has an invalid value.
 */
export const DEFAULT_GRAPHQL_SERVER_TIMEOUT = 30_000

/**
 * The defaults of the bodySizeLimit option, also used at runtime if the
 * runtime config has an invalid value.
 */
export const DEFAULT_BODY_SIZE_LIMIT = {
  mutation: 10 * 1024 * 1024,
  upload: 50 * 1024 * 1024,
}

/**
 * Whether the value is a valid timeout or size limit: false or a whole number
 * from 0 to max. false and 0 disable the timeout or limit.
 */
export function isValidLimit(
  value: unknown,
  max: number = Number.MAX_SAFE_INTEGER,
): value is number | false {
  return (
    value === false ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= max)
  )
}
