export enum GraphqlMiddlewareTemplate {
  /**
   * Contains the TS definitions for all GraphQL queries, mutations and fragments.
   */
  OperationTypes = 'graphql-operations/index.d.ts',

  /**
   * Contains the TS definitions for all GraphQL queries, mutations and fragments.
   */
  OperationTypesAll = 'nuxt-graphql-middleware/operations.d.ts',

  /**
   * Contains the TS definitions for all GraphQL queries, mutations and fragments.
   */
  Enums = 'graphql-operations/enums.ts',

  /**
   * Template for the middleware response types.
   */
  ResponseType = 'nuxt-graphql-middleware/response.d.ts',

  /**
   * Types for the generated endpoints.
   */
  Nitro = 'nuxt-graphql-middleware/nitro.d.ts',

  /**
   * Exports a single opject containing the compiled queries and mutations.
   */
  Documents = 'nuxt-graphql-middleware/documents.mjs',
}

export enum GraphqlMiddlewareOperation {
  Query = 'query',
  Mutation = 'mutation',
}

export const CLIENT_CONTEXT_PREFIX = '__gqlc_'
