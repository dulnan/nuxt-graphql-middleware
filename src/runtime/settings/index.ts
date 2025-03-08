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
  ResponseTypes = 'nuxt-graphql-middleware/response.d.ts',

  /**
   * Types for the generated endpoints.
   */
  NitroTypes = 'nuxt-graphql-middleware/nitro.d.ts',

  /**
   * Configuration template.
   */
  Helpers = 'nuxt-graphql-middleware/helpers.mjs',

  /**
   * Configuration template types.
   */
  HelpersTypes = 'nuxt-graphql-middleware/helpers.d.ts',

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
