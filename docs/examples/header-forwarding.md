# Header Forwarding

This example shows how to pass SSR request headers to the request for the
GraphQL server.

Also check out the section in Nuxt's docs about
[passing headers and cookies](https://nuxt.com/docs/getting-started/data-fetching#passing-headers-and-cookies).

## Inside Nuxt App

Use the [useGraphqlState composable](/composables/useGraphqlState) in a custom
plugin to add headers for all requests to the middleware.

::: code-group

```typescript [plugins/graphqlState.ts]
import { getProxyRequestHeaders } from 'h3'

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

      // The event is guaranteed to be available here, because the code is
      // only executed on the server.
      const event = useRequestEvent()!
      state.fetchOptions = {
        // This will forward headers such as "x-forwarded-host" to the
        // middleware, excluding headers that can't be forwarded such as
        // "Host" or "Accept".
        headers: getProxyRequestHeaders(event),
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
import { getProxyRequestHeaders } from 'h3'

export default defineGraphqlServerOptions({
  serverFetchOptions(event, operation, operationName) {
    // Same as above: Take all relevant proxy headers from the request and
    // pass them to the request to the GraphQL server.
    const headers = getProxyRequestHeaders(event)
    return { headers }
  },
})
```

:::
