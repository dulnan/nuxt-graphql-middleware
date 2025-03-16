export enum Template {
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

  /**
   * Exports a single opject containing the compiled queries and mutations.
   */
  DocumentTypes = 'nuxt-graphql-middleware/documents.d.ts',

  /**
   * Contains the source file paths for every operation.
   */
  OperationSources = 'nuxt-graphql-middleware/sources.mjs',

  Types = 'nuxt-graphql-middleware/types.d.ts',

  /**
   * The graphql-config file.
   */
  GraphqlConfig = 'nuxt-graphql-middleware/graphql.config.ts',

  /**
   * Imports and exports the user's server options file.
   */
  ServerOptions = 'nuxt-graphql-middleware/server-options.mjs',

  /**
   * Exports the server options types.
   */
  ServerOptionsTypes = 'nuxt-graphql-middleware/server-options.d.ts',

  /**
   * Imports and exports the user's client options file.
   */
  ClientOptions = 'nuxt-graphql-middleware/client-options.mjs',

  /**
   * Exports the client option specific types.
   */
  ClientOptionsTypes = 'nuxt-graphql-middleware/client-options.d.ts',
}

export enum GraphqlMiddlewareOperation {
  Query = 'query',
  Mutation = 'mutation',
}

export const CLIENT_CONTEXT_PREFIX = '__gqlc_'
