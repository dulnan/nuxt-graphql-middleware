# Full Configuration Example

## Minimal

For the module to work you only need to provide a `graphqlEndpoint` value.

```typescript
import { defineNuxtConfig } from 'nuxt'

export default defineNuxtConfig({
  graphqlMiddleware: {
    graphqlEndpoint: 'https://api.example.com/graphql'
  }
}
```

## Full nuxt.config.ts example

```typescript
import { defineNuxtConfig } from 'nuxt'
import { getHeader } from 'h3'
import acceptLanguageParser from 'accept-language-parser'

const isDev = process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  graphqlMiddleware: {
    /**
     * Hardcoded GraphQL endpoint URL.
     */
    graphqlEndpoint: 'https://api.example.com/graphql',

    /**
     * Match GraphQL files in the pages and components folder and from an
     * installed dependency.
     */
    autoImportPatterns: [
      'pages/**/*.{gql,graphql}',
      'components/**/*.{gql,graphql}',
      'node_modules/super-cms-client/queries/*.graphql',
    ],

    /**
     * Only download the schema when in development mode.
     */
    downloadSchema: isDev,

    /**
     * Save the schema in a subfolder.
     */
    schemaPath: './schema/schema-cms.graphql',

    /**
     * Use a root level path for the server routes.
     */
    serverApiPrefix: '/graphql-middleware',

    /**
     * Enabled debug messages in dev mode.
     */
    debug: isDev,

    /**
     * Output all compiled documents in
     * .nuxt/nuxt-graphql-middleware/documents.
     */
    outputDocuments: true,

    /**
     * Generate a query at build time.
     */
    documents: [
      `
    query myQuery {
      articlesForSite(site: "${process.env.SITE}") {
        title
        id
      }
    }
    `,
    ],

    /**
     * Override default configuration to create better TypeScript types.
     */
    codegenConfig: {
      constEnums: false,
      enumsAsConst: false,
      enumPrefix: true,
      avoidOptionals: false,
      preResolveTypes: true,
      maybeValue: 'T',
      flattenGeneratedTypes: false,
      exportFragmentSpreadSubTypes: true,
      skipTypeNameForRoot: true,
      inlineFragmentTypes: 'combine',
      dedupeFragments: false,
      nonOptionalTypename: false,
      skipTypename: true,
    },

    codegenSchemaConfig: {
      schemaAstConfig: {
        includeDirectives: true,
        includeIntrospectionTypes: true,
        sort: true,
      },
      urlSchemaOptions: {
        headers: {
          authentication: 'IBZxopckhZLalbbIzgp7VE0ae/+N0FAsA6D/31jDBuU=',
        },
      },
    },
  },
})
```

## Full ~/app/graphqlMiddleware.serverOptions.ts example

```typescript
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'
import { getHeader, createError } from 'h3'
import type { H3Event } from 'h3'
import type { FetchError } from 'ofetch'

export default defineGraphqlServerOptions({
  /**
   * Determine the GraphQL endpoint on every request.
   *
   * The GraphQL endpoint used depends on the language prefix for correctly
   * returning the content in the correct language.
   */
  graphqlEndpoint(event, operation, operationName) {
    // Get accepted languages.
    const acceptLanguage = getHeader('accept-language')
    const languages = acceptLanguageParser.parse(acceptLanguage)

    // Use first match or fallback to English.
    const language = languages[0]?.code || 'en'
    return `https://api.example.com/${language}/graphql`
  },

  /**
   * Provide FetchOptions for the request to the GraphQL server.
   */
  serverFetchOptions: function (event) {
    // Pass the cookie from the client request to the GraphQL request.
    return {
      headers: {
        Cookie: getHeader(event, 'cookie'),
      },
    }
  },

  /**
   * Handle 4xx/5xx errors happening when making the request to the
   * GraphQL server.
   */
  onServerError(event, error, operation, operationName) {
    // Throw a h3 error.
    throw createError({
      statusCode: 500,
      statusMessage: `Couldn't execute GraphQL ${operation} "${operationName}".`,
      data: error.message,
    })
  },

  /**
   * Alter response from GraphQL server.
   */
  onServerResponse(event, graphqlResponse) {
    // Set a static header.
    event.node.res.setHeader('x-nuxt-custom-header', 'A custom header value')
    // Pass the set-cookie header from the GraphQL response to the client.
    const setCookie = graphqlResponse.headers.get('set-cookie')
    if (setCookie) {
      event.node.res.setHeader('set-cookie', setCookie)
    }

    // Add additional properties to the response.
    graphqlResponse._data.__customProperty = ['My', 'values']

    // Return the GraphQL response.
    return graphqlResponse._data
  },
})
```
