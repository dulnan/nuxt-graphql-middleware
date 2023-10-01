# Using Auth Headers

If your GraphQL endpoint requires you to authenticate requests via
`Authentication` header (or any other header) there's two things you need to do:

## For `schema-ast` introspection requests (downloading schema) during build

Header key and value must be provided directly in the configuration. Check out
the
[full reference of the available configuration options](https://the-guild.dev/graphql/codegen/docs/config-reference/schema-field#supported-configuration)
for the `urlSchemaOptions` property.

```typescript
import { defineNuxtConfig } from 'nuxt'

export default defineNuxtConfig({
  graphqlMiddleware: {
    graphqlEndpoint: 'https://api.example.com/graphql',

    codegenSchemaConfig: {
      urlSchemaOptions: {
        headers: {
          authentication: 'IBZxopckhZLalbbIzgp7VE0ae/+N0FAsA6D/31jDBuU=',
        },
      },
    },
  },
})
```

## For query/mutation requests at runtime

Define a `serverFetchOptions` callback in
`~/app/graphqlMiddleware.serverOptions.ts`. This method is called before a
GraphQL request is made.

```typescript
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'
import { getHeader, createError } from 'h3'
import type { H3Event } from 'h3'
import type { FetchError } from 'ofetch'

export default defineGraphqlServerOptions({
  serverFetchOptions: function (event) {
    return {
      headers: {
        authentication: 'IBZxopckhZLalbbIzgp7VE0ae/+N0FAsA6D/31jDBuU=',
      },
    }
  },
})
```
