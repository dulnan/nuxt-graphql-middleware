export enum GraphqlMiddlewareTemplate {
  /**
   * Contains the TS definitions for all GraphQL queries, mutations and fragments.
   */
  OperationTypes = 'graphql-operations.d.ts',

  /**
   * Signature for the GraphQL composable arguments and return types.
   */
  ComposableContext = 'nuxt-graphql-middleware.d.ts',

  /**
   * Exports a single opject containing the compiled queries and mutations.
   */
  Documents = 'graphql-documents.mjs',
}

export enum GraphqlMiddlewareOperation {
  Query = 'query',
  Mutation = 'mutation',
}
