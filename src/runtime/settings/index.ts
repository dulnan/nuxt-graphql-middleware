export enum GraphqlMiddlewareTemplate {
  /**
   * Contains the TS definitions for all GraphQL queries, mutations and fragments.
   */
  OperationTypes = 'graphql-operations.d.ts',

  /**
   * Signature for the GraphQL composable arguments and return types.
   */
  ComposableContext = 'nuxt-graphql-middleware/generated-types.d.ts',

  /**
   * Exports a single opject containing the compiled queries and mutations.
   */
  Documents = 'nuxt-graphql-middleware/graphql-documents.mjs',
}

export enum GraphqlMiddlewareOperation {
  Query = 'query',
  Mutation = 'mutation',
}

export const CLIENT_CONTEXT_PREFIX = '__gqlc_'
