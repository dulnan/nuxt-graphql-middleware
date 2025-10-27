# Handling Authentication

This example shows how to handle authentication.

The Nuxt docs have a section on
[passing headers and cookies](https://nuxt.com/docs/getting-started/data-fetching#passing-headers-and-cookies)
from server-side API calls during SSR.

## Request: On the client

### Inline

You can directly pass fetch options in any of the available composables:

```typescript
const token = useToken()

const data = await useGraphqlQuery('loadUsers', null, {
  fetchOptions: {
    headers: {
      Authorization: 'Bearer ' + token.value,
    },
  },
})
```

### Using `useGraphqlState()`

If you want to always pass a token on every request to the middleware you can do
so using the [useGraphqlState() composable](/composables/useGraphqlState).

::: code-group

```typescript [plugins/graphqlState.ts]
export default defineNuxtPlugin({
  name: 'custom-plugin:graphql-request',
  dependsOn: ['nuxt-graphql-middleware-provide-state'],
  setup() {
    const state = useGraphqlState()

    if (!state) {
      throw new Error('GraphQL state not available.')
    }

    const token = useToken()

    // These are the regular fetch options from ofetch.
    state.fetchOptions = {
      onRequest({ options, request }) {
        if (token.value) {
          // Header will be sent for every request.
          options.headers.set('Authorization', 'Bearer ' + token.value)
        }
      },
    }
  },
})
```

:::

## Request: On the server

Now that we sent headers to the middleware we need to pass the headers from the
middleware to the GraphQL server. To do this, we need to define
[server options](/configuration/server-options).

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'
import { getHeader } from 'h3'

export default defineGraphqlServerOptions({
  serverFetchOptions(event, operation, operationName) {
    const headers: Record<string, string> = {}

    const value = getHeader(event, 'Authorization')
    if (value) {
      headers['Authorization'] = value
    }

    return {
      headers,
    }
  },
})
```

:::

## Response: On the server

If we also want to pass headers back from the GraphQL server to our Nuxt app.
This is done in the `onServerResponse()` method:

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'
import { appendResponseHeader } from 'h3'

export default defineGraphqlServerOptions({
  onServerResponse(event, graphqlResponse) {
    // Assuming that the new token is sent as a set-cookie header.
    const cookies = graphqlResponse.headers.getSetCookie()

    if (cookies) {
      for (const cookie of cookies) {
        appendResponseHeader(event, 'set-cookie', cookie)
      }
    }

    // Return the GraphQL response.
    return graphqlResponse._data
  },
})
```

:::

## Response: On the client

Now the response _from the middleware_ contains a `Set-Cookie` header.

### During SSR

During SSR we additionally need to add the `Set-Cookie` header to the **SSR
response**.

::: code-group

```typescript [plugins/graphqlState.ts]
import { appendResponseHeader } from 'h3'

export default defineNuxtPlugin({
  name: 'custom-plugin:graphql-request',
  dependsOn: ['nuxt-graphql-middleware-provide-state'],
  setup() {
    if (import.meta.server) {
      const state = useGraphqlState()

      if (!state) {
        throw new Error('GraphQL state not available.')
      }

      const event = useRequestEvent()

      state.fetchOptions = {
        onResponse(result) {
          // The response headers from the middleware request.
          const headers = result.response?.headers

          if (!headers) {
            return
          }

          const cookies = headers.getSetCookie()

          // Append all cookies to the response.
          for (const cookie of cookies) {
            appendResponseHeader(event, 'set-cookie', cookie)
          }
        },
      }
    }
  },
})
```

:::

### During client-side rendering

If you're using cookies to handle your token, there is _no additional code_
needed, because during client side rendering the browser already receives a
response from the middleware that contains a `Set-Cookie` header, so the browser
will update the cookie accordingly.
