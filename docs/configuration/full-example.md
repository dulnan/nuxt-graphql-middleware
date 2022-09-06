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

## Full example

```typescript
import { defineNuxtConfig } from 'nuxt'
import { getHeader } from 'h3'
import acceptLanguageParser from 'accept-language-parser';

const isDev = process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  graphqlMiddleware: {
    /**
     * Determine the GraphQL endpoint on every request.
     *
     * The GraphQL endpoint used depends on the language prefix for correctly
     * returning the content in the correct language.
     */
    graphqlEndpoint(event, operation, operationName) {
      // Get accepted languages.
      const acceptLanguage = getHeader('accept-language')
      const languages = acceptLanguageParser.parse(acceptLanguage);

      // Use first match or fallback to English.
      const language = languages[0]?.code || 'en'
      return `https://api.example.com/${language}/graphql`
    },

    /**
     * Match GraphQL files in the pages and components folder and from an
     * installed dependency.
     */
    autoImportPatterns: [
      'pages/**/*.{gql,graphql}',
      'components/**/*.{gql,graphql}',
      'node_modules/super-cms-client/queries/*.graphql'
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
     * Pass the client cookie to the request to the GraphQL server.
     */
    serverFetchOptions(event, operation, operationName) {
      return {
        headers: {
          Cookie: getHeader(event, 'cookie')
        }
      }
    },

    /**
     * Enabled debug messages in dev mode.
     */
    debug: isDev,

    /**
     * Generate a query at build time.
     */
    documents: [`
    query myQuery {
      articlesForSite(site: "${process.env.SITE}") {
        title
        id
      }
    }
    `],

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
  }
}
```
