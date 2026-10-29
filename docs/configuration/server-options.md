# Server Options

All dynamic configuration that deals with the server-side requests made to the
GraphQL server is located in a special runtime file located at
`~/server/graphqlMiddleware.serverOptions.ts`. This file is bundled together
with the nitro build in the .output folder.

Create a file called `graphqlMiddleware.serverOptions.ts` inside the `serverDir`
of your Nuxt project. If you didn't specifically override this in your Nuxt
config this will be `./server`.

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'

export default defineGraphqlServerOptions({
  // ...
})
```

:::

### Nuxt Layers

The server options file is also discovered from
[Nuxt layers](https://nuxt.com/docs/getting-started/layers). The module checks
all layers in order, starting with the main app. The first layer that contains a
`graphqlMiddleware.serverOptions` file wins — options from multiple layers are
**not** merged.

## doGraphqlRequest

Provide a custom method that performs the request to the GraphQL server. It
receives a single `context` object argument that contains everything required to
perform the request.

The method is called in the /api/graphql server handler. It can do the request
using `fetch`, `graphql-request` or even a full-fledged library like
`@apollo/client`.

If a custom method is provided all other options (such as graphqlEndpoint,
serverFetchOptions or onServerResponse) are ignored. The return value of the
method is directly returned as the response in the server route.

### Example: Custom fetch with retry

This example assumes some kind of cookie based token authentication. If the
request fails because of an expired token it will refresh the token and then
retry the request.

```typescript
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'
import { refreshToken } from './../helpers'

export default defineGraphqlServerOptions({
  async doGraphqlRequest({
    event,
    operationName,
    operationDocument,
    variables,
  }) {
    function doRequest(token: string) {
      return $fetch.raw('https://example.com/graphql', {
        method: 'POST',
        ignoreResponseError: true,
        body: {
          query: operationDocument,
          variables,
          operationName,
        },
        headers: {
          token,
        },
      })
    }

    // Do the first request.
    const incomingToken = getHeader(event, 'cookie')
    let result = await doRequest(incomingToken)

    // If the status is 401 refresh the token.
    if (result.status === 401) {
      const newToken = await refreshToken(incomingToken)
      // Retry the request.
      result = await doRequest(newToken)
    }

    // Return the GraphQL response.
    return result._data
  },
})
```

## graphqlEndpoint

Dynamically set the GraphQL endpoint URL during runtime per request.

```typescript
type GraphqlMiddlewareGraphqlEndpointMethod = (
  event?: H3Event,
  operation?: string,
  operationName?: string,
) => string | Promise<string> | void
```

### Example: Endpoint based on language

Here we determine the current language from the incoming `Accept-Language`
header and use it to target a specific language-prefixed GraphQL endpoint.

```typescript
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'
import { getHeader } from 'h3'
import acceptLanguageParser from 'accept-language-parser'

export default defineGraphqlServerOptions({
  graphqlEndpoint(event, operation, operationName) {
    // Get accepted languages.
    const acceptLanguage = getHeader('accept-language')
    const languages = acceptLanguageParser.parse(acceptLanguage)

    // Use first match or fallback to English.
    const language = languages[0]?.code || 'en'
    return `https://api.example.com/${language}/graphql`
  },
})
```

## serverFetchOptions

Provide the options for the ofetch request to the GraphQL server.

```typescript
type GraphqlMiddlewareServerFetchOptionsMethod = (
  event?: H3Event,
  operation?: string,
  operationName?: string,
) => FetchOptions | Promise<FetchOptions>
```

### Example: Pass cookie from client to GraphQL server

```typescript
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'
import { getHeader } from 'h3'

// Pass the cookie from the client request to the GraphQL request.
export default defineGraphqlServerOptions({
  serverFetchOptions(event, operation, operationName) {
    return {
      headers: {
        Cookie: getHeader(event, 'cookie'),
      },
    }
  },
})
```

### Example: Longer timeout for a single operation

Requests to the GraphQL server are aborted after the
[`graphqlServerTimeout`](/configuration/module#graphqlservertimeout) (30 seconds
by default). A `timeout` (in milliseconds) or `signal` returned here takes
precedence, and `timeout: 0` disables it.

```typescript
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'

export default defineGraphqlServerOptions({
  serverFetchOptions(event, operation, operationName) {
    if (operationName === 'importProducts') {
      return { timeout: 5 * 60 * 1000 }
    }
    return {}
  },
})
```

Unlike the `timeout` option of ofetch, which only limits the time until the
response headers arrive, the timeout also covers reading the response.

Queries are also aborted when the client closes the connection before the
response is sent, for example because the user left the page. A `signal`
returned here is combined with that. Mutations and uploads are not aborted when
the client closes the connection, as some GraphQL servers stop halfway if the
connection is closed.

## onServerResponse

Handle the response from the GraphQL server.

You can alter the response, add additional properties to the data, get and set
headers, etc.

```typescript
type GraphqlMiddlewareOnServerResponseMethod = (
  event: H3Event,
  response: FetchResponse<any>,
  operation?: string,
  operationName?: string,
) => any | Promise<any>
```

If no method is provided, the middleware returns the response of the GraphQL
server if it is a JSON object. Any other response, for example text or an error
page from a proxy, is refused with a 502 status code, because it would otherwise
be sent to the client as HTML. In production the details are logged on the
server.

If you provide a method, make sure it doesn't return strings from the GraphQL
server's response: h3 sends strings as HTML.

### Example: Pass cookie from client to GraphQL server and add custom property

You can provide a generic argument (object) to define custom properties added to
the response.

```typescript
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'
import type { H3Event } from 'h3'
import type { FetchResponse } from 'ofetch'

export default defineGraphqlServerOptions<{ __customProperty: string[] }>({
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

## onServerError

Handle a fetch error from the GraphQL request.

Note that errors are only thrown for responses that are not status 200-299. See
https://github.com/unjs/ofetch#%EF%B8%8F-handling-errors for more information.

```typescript
type GraphqlMiddlewareOnServerErrorMethod = (
  event: H3Event,
  error: FetchError,
  operation?: string,
  operationName?: string,
) => any | Promise<any>
```

If no method is provided, the middleware responds with a 500 status code, or
with a 504 if the request timed out. In production the response only contains a
generic message and the `errors` of the GraphQL server's response, if it is a
GraphQL response. The error message, which contains the URL of the GraphQL
server, is logged on the server. In dev mode the response also contains the
error message and the whole response of the GraphQL server.

### Example: Always return a 200 status to the clients

```typescript
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/server-options'
import { setResponseHeader } from 'h3'

export default defineGraphqlServerOptions({
  onServerError(event, error, operation, operationName) {
    // The message contains the URL of the GraphQL server, so it's only logged.
    console.error(error.message)
    setResponseHeader(event, 'cache-control', 'no-cache')
    return {
      data: {},
      errors: [
        { message: `Couldn't execute ${operation} "${operationName}".` },
      ],
    }
  },
})
```
