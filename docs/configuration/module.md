# Module Configuration

## graphqlEndpoint: string

The URL of the GraphQL server.

You can also
[provide an URL at runtime](/configuration/server-options.html#graphqlendpoint-determine-graphql-endpoint-per-request)
via serverOptions.

### Example: Static URL

```typescript
import { defineNuxtConfig } from 'nuxt'

export default defineNuxtConfig({
  graphqlMiddleware: {
    graphqlEndpoint: 'https://api.example.com/graphql'
  }
}
```

## autoImportPatterns: string[]

File glob patterns for the auto import feature. If left empty, no documents are
auto imported.

### Default

```json
["**/*.{gql,graphql}", "!node_modules"]
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
'/api/graphql_middleware'
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
specified path. If `downloadSchema` is `false`, this file must be present in
order to generate types.

### default

```typescript
'./schema.graphql'
```

## codegenConfig: TypeScriptDocumentsPluginConfig

These options are passed to the graphql-codegen method when generating the
operations types.

[Check out `@graphql-codegen/typescript-operations` for all available options](https://www.the-guild.dev/graphql/codegen/plugins/typescript/typescript-operations)

## outputDocuments: boolean

Output the compiled documents to disk. Path is
$buildDir/nuxt-graphql-middleware/documents, usually
`/.nuxt/nuxt-graphql-middleware/documents`.

### default

```typescript
false
```

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
