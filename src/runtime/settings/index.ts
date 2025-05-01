export enum GraphqlMiddlewareOperation {
  Query = 'query',
  Mutation = 'mutation',
}

export const CLIENT_CONTEXT_PREFIX = '__gqlc_'
export const OPERATION_HASH_PREFIX = '__gqlh'
