export type BuildImport = {
  name: string
  description: string
  docsUrl: string
  context: 'nuxt' | 'nitro'
}

function defineImport(
  name: string,
  description: string,
  context: 'nuxt' | 'nitro',
): BuildImport {
  const docsPath = context === 'nuxt' ? 'composables' : 'server-utils'
  return {
    name,
    description,
    context,
    docsUrl: `https://nuxt-graphql-middleware.dulnan.net/${docsPath}/${name}.html`,
  }
}

const useGraphqlQuery = defineImport(
  'useGraphqlQuery',
  'Perform a GraphQL query via the middleware. Returns a promise. Can be used anywhere - in components, plugins, other composables, event handlers, or inside useAsyncData.',
  'nuxt',
)

const useAsyncGraphqlQuery = defineImport(
  'useAsyncGraphqlQuery',
  'SSR-compatible, reactive data fetching. Must be called at the root of a component setup or inside another composable. Same limitations as useAsyncData.',
  'nuxt',
)

const useGraphqlMutation = defineImport(
  'useGraphqlMutation',
  'Perform a GraphQL mutation via the middleware. Returns a promise. Can be used anywhere - in components, plugins, other composables, or event handlers.',
  'nuxt',
)

const useGraphqlUploadMutation = defineImport(
  'useGraphqlUploadMutation',
  'Perform a GraphQL mutation via the middleware with support for file uploads. Returns a promise. Can be used anywhere - in components, plugins, other composables, or event handlers.',
  'nuxt',
)

const useGraphqlState = defineImport(
  'useGraphqlState',
  'allows you to set fetch options for the useGraphqlQuery, useAsyncGraphqlQuery and useGraphqlMutation composables. One common use case is to pass custom request headers to the GraphQL middleware request.',
  'nuxt',
)

export const COMPOSABLES = {
  useGraphqlQuery,
  useGraphqlMutation,
  useAsyncGraphqlQuery,
  useGraphqlUploadMutation,
  useGraphqlState,
}

export type ComposableName = keyof typeof COMPOSABLES

const serverUseGraphqlQuery = defineImport(
  'useGraphqlQuery',
  'Perform a GraphQL query via the middleware in a Nitro server context. Auto-imported and available in event handlers, server plugins, and other server-side code.',
  'nitro',
)

const serverUseGraphqlMutation = defineImport(
  'useGraphqlMutation',
  'Perform a GraphQL mutation via the middleware in a Nitro server context. Auto-imported and available in event handlers, server plugins, and other server-side code.',
  'nitro',
)

const doGraphqlRequest = defineImport(
  'doGraphqlRequest',
  'Perform a raw GraphQL request in a Nitro server context. Provides low-level access to execute arbitrary GraphQL queries and mutations.',
  'nitro',
)

export const SERVER_UTILS = {
  useGraphqlQuery: serverUseGraphqlQuery,
  useGraphqlMutation: serverUseGraphqlMutation,
  doGraphqlRequest,
}

export type ServerUtilName = keyof typeof SERVER_UTILS
