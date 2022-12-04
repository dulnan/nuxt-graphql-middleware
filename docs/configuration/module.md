# Configuration

## graphqlEndpoint: string | GraphqlMiddlewareGraphqlEndpointMethod
The URL of the GraphQL server.

You can either provide a string or a method that returns a string.
If you provide a method it will be called everytime a GraphQL request is
made in the server API handler. The first argument is the [h3
event](https://www.jsdocs.io/package/h3#H3Event).

### Example: Static URL
```typescript
import { defineNuxtConfig } from 'nuxt'

export default defineNuxtConfig({
  graphqlMiddleware: {
    graphqlEndpoint: 'https://api.example.com/graphql'
  }
}
```


### Example: Endpoint based on language
```typescript
import { defineNuxtConfig } from 'nuxt'
import { getHeader } from 'h3'
import acceptLanguageParser from 'accept-language-parser';

export default defineNuxtConfig({
  graphqlMiddleware: {
    graphqlEndpoint(event, operation, operationName) {
      // Get accepted languages.
      const acceptLanguage = getHeader('accept-language')
      const languages = acceptLanguageParser.parse(acceptLanguage);

      // Use first match or fallback to English.
      const language = languages[0]?.code || 'en'
      return `https://api.example.com/${language}/graphql`
    }
  }
}
```

## autoImportPatterns: string[]
File glob patterns for the auto import feature. If left empty, no documents are
auto imported.

### Default
```json
[
  "**/*.{gql,graphql}",
  "!node_modules"
]
```

### Example
```typescript
import { defineNuxtConfig } from 'nuxt'

// Load .graphql files from pages folder and from a node_modules dependency.
export default defineNuxtConfig({
  graphqlMiddleware: {
    autoImportPatterns: [
      './pages/**\/*.graphql',
      'node_modules/my_library/dist/**\/*.graphql'
    ]
  }
}
```

## documents: string[]
Additional raw documents to include.

Useful if for example you need to generate queries during build time.

### Default
```json
[]
```

### Example
```typescript
import { defineNuxtConfig } from 'nuxt'
import { getGeneratedDocuments } from './helpers'

export default defineNuxtConfig({
  graphqlMiddleware: {
    documents: [`
      query myQuery {
        articles {
          title
          id
        }
      }`,
      ...getGeneratedDocuments()
    ]
  }
}
```

## includeComposables: boolean
Wether the useGraphqlQuery, useGraphqlMutation and useGraphqlState composables
should be included.

Set this to false if you want to customize how to do your queries and mutations
inside your app. You can also create your own composables that extend the
provided composables.

### Default
```typescript
true
```

## debug: boolean
Enable detailled debugging messages.

### Default
```typescript
false
```

## serverApiPrefix: string
The prefix for the server route.

### Default
```typescript
"/api/graphql_middleware"
```

## serverFetchOptions: FetchOptions | GraphqlMiddlewareServerFetchOptionsMethod
Provide the options for the ohmyfetch request to the GraphQL server.

### Default
```typescript
undefined
```

### Example: Pass cookie from client to GraphQL server
```typescript
import { defineNuxtConfig } from 'nuxt'
import { getHeader } from 'h3'

// Pass the cookie from the client request to the GraphQL request.
export default defineNuxtConfig({
  graphqlMiddleware: {
    serverFetchOptions(event, operation, operationName) {
      return {
        headers: {
          Cookie: getHeader(event, 'cookie')
        }
      }
    }
  }
}
```

## downloadSchema: boolean
Download the GraphQL schema and save it to disk.

### Default
```typescript
true
```

## schemaPath: string
Path to the GraphQL schema file.

If `downloadSchema` is `true`, the downloaded schema is written to this
specified path.
If `downloadSchema` is `false`, this file must be present in order to generate
types.

### default
```typescript
'./schema.graphql'
```

## codegenConfig: TypeScriptDocumentsPluginConfig
These options are passed to the graphql-codegen method when generating the
operations types.

[Check out `@graphql-codegen/typescript-operations` for all available
options](https://www.the-guild.dev/graphql/codegen/plugins/typescript/typescript-operations)


### Default

```typescript
const codegenConfig = {
  exportFragmentSpreadSubTypes: true,
  preResolveTypes: true,
  skipTypeNameForRoot: true,
  skipTypename: true,
  useTypeImports: true,
  onlyOperationTypes: true,
  namingConvention: {
    enumValues: 'change-case-all#upperCaseFirst',
  },
}
```
