# Server Options

All dynamic configuration that deals with the server-side requests made to the
GraphQL server is located in a special runtime file located at
`~/app/graphqlMiddleware.serverOptions.ts`. This file is bundled together with
the nitro build in the .output folder.

Create a file called `graphqlMiddleware.serverOptions.ts` (or js/mjs) inside the
`app` folder in your Nuxt root.

::: code-group

```typescript [~/app/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from '#graphql-server-options'

export default defineGraphqlServerOptions({
  // ...
})
```

:::

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
import { defineGraphqlServerOptions } from '#graphql-server-options'
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
import { defineGraphqlServerOptions } from '#graphql-server-options'
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

### Example: Pass cookie from client to GraphQL server

```typescript
import { defineGraphqlServerOptions } from '#graphql-server-options'
import type { H3Event } from 'h3'
import type { FetchResponse } from 'ofetch'

export default defineGraphqlServerOptions({
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

### Example: Always return a 200 status to the clients

```typescript
import { defineGraphqlServerOptions } from '#graphql-server-options'
import type { H3Event } from 'h3'
import type { FetchError } from 'ofetch'

export default defineGraphqlServerOptions({
  onServerError(event, error, operation, operationName) {
    event.setHeader('cache-control', 'no-cache')
    return {
      data: {},
      errors: [error.message],
    }
  },
})
```
