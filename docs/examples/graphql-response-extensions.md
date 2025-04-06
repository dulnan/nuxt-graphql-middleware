# GraphQL Response Extensions

You can type additional extensions to the GraphQL response. By default, the
response only contains the `data` and `errors` properties.

You have the ability to alter the response and add any additional properties or
extensions you want.

::: warning

You must return `data` and `errors` in the response, as they are required by the
module to work (such as composables or error handling during development).

:::

## Defining a Type

First you need to define [server options](/configuration/server-options).

The `defineGraphqlServerOptions` method accepts a generic argument to type your
_additional_ properties on the GraphQL response. For example:

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'

export default defineGraphqlServerOptions<{
  extensions: {
    // Added by the middleware.
    cacheability: {
      isCacheable: boolean
      cacheTags: string[]
      maxAge: number
    }

    // Coming from the GraphQL server itself.
    propertyFromServer: string
  }
}>({})
```

:::

This will globally adjust the type of any GraphQL response to also include an
`extensions` property:

```typescript
const response = await useGraphqlQuery('loadUsers')

// Fully typed response.
console.log(response.extensions.cacheTags)
```

## Altering the Response

Implement the `onServerResponse` method to actually return the response
extensions.

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'

export default defineGraphqlServerOptions<{
  extensions: {
    // Added by the middleware.
    cacheability: {
      isCacheable: boolean
      cacheTags: string[]
      maxAge: number
    }

    // Coming from the GraphQL server itself.
    propertyFromServer: string
  }
}>({
  onServerResponse(event, graphqlResponse, operation, operationName) {
    // Get headers from the GraphQL response.
    const cacheTags = graphqlResponse.headers.get('x-cache-tags') || ''
    const maxAge = graphqlResponse.headers.get('x-max-age')

    const extensions = graphqlResponse._data!.extensions || {}

    // Return the response, including our custom additions/extensions.
    return {
      data: graphqlResponse._data!.data,
      errors: graphqlResponse._data!.errors,
      extensions: {
        // Custom extensions added by the middleware.
        cacheability: {
          cacheTags: cacheTags.split(','),
          maxAge,
        },

        // Extensions directly coming from the GraphQL server.
        ...extensions,
      },
    }
  },
})
```

:::
