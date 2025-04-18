# Client Options

`nuxt-graphql-middleware` will look for a file called
`graphqlMiddleware.clientOptions.ts` in your app dir. This file can export so
called "client options" which are used when _making a request to the GraphQL
middleware_.

::: warning

Note that the client options are only used in a **Nuxt app context** - they are
not used when using `useGraphqlQuery` or other utils in a **Nitro context** such
as event handlers.

:::

## Defining Client Options

When using a composable such as `useGraphqlQuery`, behind the scenes it will use
`$fetch` to make a request to the GraphQL middleware server route. Sometimes
it's useful to pass some additional context with this request that can then be
used on the server.

Similar to [serverOptions](/configuration/server-options), you can create a file
called `graphqlMiddleware.clientOptions.ts` in your `app` directory (usually
`<rootDir>/app`).

::: code-group

```typescript [~/app/graphqlMiddleware.clientOptions.ts]
import { defineGraphqlClientOptions } from 'nuxt-graphql-middleware/client-options'

export default defineGraphqlClientOptions({})
```

:::

## Defining Client Context

Implement the `buildClientContext()` method to return an object with string
values.

::: code-group

```typescript [~/app/graphqlMiddleware.clientOptions.ts]
import { defineGraphqlClientOptions } from 'nuxt-graphql-middleware/client-options'

export default defineGraphqlClientOptions<{
  language: string
  country: string
}>({
  buildClientContext() {
    const language = useCurrentLanguage()
    const country = useCurrentCountry()
    return {
      language: language.value,
      country: country.value,
    }
  },
})
```

:::

::: info

By passing a generic in `defineGraphqlClientOptions` you can define the type of
your context object.

:::

Now everytime a request to the middleware is made with a composable such as
`useGraphqlQuery`, the composable will call the `buildClientContext` method to
get the current context. It then maps each property of the returned object to a
query parameter while prefixing the property to prevent collisions with
potential query parameters from GraphQL variables.

So for example, when making a GraphQL query like so:

```typescript
const data = await useGraphqlQuery('loadProduct', {
  id: '123',
})
```

The composable will make a fetch request to this URL.

`/api/graphql_middleware/loadProduct?id=123&__gqlc_language=en&__gqlc_country=US`

Both the `language` and `country` properties we returned in the object in
`buildClientContext()` are appended as prefixed query parameters.

## Using Client Context

On the server you can then access this client context from within all
[serverOptions](/configuration/server-options) methods:

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'

export default defineGraphqlServerOptions({
  graphqlEndpoint(event, operation, operationName, context) {
    // Use the language from the client context.
    const language = context?.client?.language || 'en'
    return `http://backend_server/${language}/graphql`
  },

  serverFetchOptions: function (event, _operation, operationName, context) {
    // Pass the current country as a header when making a request to the
    // GraphQL server.
    return {
      headers: {
        'x-current-country': context.client?.country || 'US',
      },
    }
  },
})
```

:::
