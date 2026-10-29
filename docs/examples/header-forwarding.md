# Header Forwarding

This example shows how to pass SSR request headers to the request for the
GraphQL server.

Also check out the section in Nuxt's docs about
[passing headers and cookies](https://nuxt.com/docs/getting-started/data-fetching#passing-headers-and-cookies).

::: warning

Only forward the headers the GraphQL server needs, instead of all headers:

- Headers such as `x-forwarded-for` or `x-forwarded-host` can be set by any
  client. Only forward them if a proxy in front of your app sets them.
- Headers such as `content-type` and `content-length` describe the request to
  the middleware, not the request the middleware makes to the GraphQL server.

:::

## Inside Nuxt App

Use the [useGraphqlState composable](/composables/useGraphqlState) in a custom
plugin to add headers for all requests to the middleware.

::: code-group

```typescript [plugins/graphqlState.ts]
export default defineNuxtPlugin({
  name: 'custom-plugin:graphql-request',
  dependsOn: ['nuxt-graphql-middleware-provide-state'],
  setup() {
    if (import.meta.server) {
      const state = useGraphqlState()

      if (!state) {
        // This can only happen if this plugin somehow runs before
        // nuxt-graphql-middleware-provide-state, which should never be the case
        // as long as `dependsOn` is set.
        throw new Error('GraphQL state not available.')
      }

      state.fetchOptions = {
        // Forward the headers of the SSR request that the GraphQL server
        // needs to the middleware.
        headers: useRequestHeaders([
          'cookie',
          'authorization',
          'accept-language',
        ]),
      }
    }
  },
})
```

:::

## On the server

Now that we sent headers to the middleware we need to pass the headers from the
middleware to the GraphQL server. To do this, we need to define
[server options](/configuration/server-options).

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'
import { getRequestHeader } from 'h3'

// The headers to pass to the GraphQL server.
const FORWARDED_HEADERS = ['cookie', 'authorization', 'accept-language']

export default defineGraphqlServerOptions({
  serverFetchOptions(event, operation, operationName) {
    const headers: Record<string, string> = {}
    for (const name of FORWARDED_HEADERS) {
      const value = getRequestHeader(event, name)
      if (value) {
        headers[name] = value
      }
    }
    return { headers }
  },
})
```

:::
