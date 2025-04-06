# Integration with nuxt-multi-cache

This example shows how to integrate
[nuxt-multi-cache](https://nuxt-multi-cache.dulnan.net).

## `useCDNHeaders()`

The
[useCDNHeaders()](https://nuxt-multi-cache.dulnan.net/composables/useCDNHeaders)
composable adds support for setting cacheability headers for CDNs such as Fastly
or Cloudflare. In this example we assume that the GraphQL server sends
cacheability headers in its response.

### Adding cacheability to the middleware response

First you need to define [server options](/configuration/server-options) if not
yet done.

Implement the `onServerResponse` method to intercept the GraphQL response,
before it is sent in the middleware.

::: code-group

```typescript [~/server/graphqlMiddleware.serverOptions.ts]
import { defineGraphqlServerOptions } from 'nuxt-graphql-middleware/dist/runtime/serverOptions'
import { useCDNHeaders } from '#nuxt-multi-cache/composables'
import { setResponseHeader } from 'h3'

export default defineGraphqlServerOptions<{
  extensions: {
    cacheability: {
      isPrivate: boolean
      cacheTags: string[]
      maxAge: number
    }
  }
}>({
  onServerResponse(event, graphqlResponse, operation, operationName) {
    const cacheTags = (
      graphqlResponse.headers.get('Surrogate-Key') || ''
    ).split(' ')
    const control = graphqlResponse.headers.get('Surrogate-Control')

    // You could also use "parse" from @tusbar/cache-control to properly
    // parse the cache control header.

    // A custom non-standard header that contains the max age
    // of the response.
    const maxAgeValue = graphqlResponse.headers.get('x-max-age') || '0'
    const maxAge = parseInt(maxAgeValue)

    // GraphQL response errors.
    const errors = graphqlResponse._data!.errors

    // Mark the response private if there are errors or if the response
    // is already private.
    const isPrivate = errors.length > 0 || control.includes('private')

    useCDNHeaders((cdn) => {
      if (isPrivate) {
        return cdn.private()
      }

      // Add the cache tags and set the max age.
      cdn.addTags(cacheTags).setNumeric('maxAge', maxAge).public()
    }, event)

    return {
      data: graphqlResponse._data!.data,
      errors,

      // Return the cacheability in the response.
      extensions: {
        cacheability: {
          isPrivate,
          cacheTags,
          maxAge,
        },
      },
    }
  },
})
```

:::

Now every response from the middleware will be cacheable on our CDN. In
addition, it passes cacheability of the response back to the client.

### Merging cacheability during SSR

Now we need to pass the cacheability in our SSR response.

During SSR we can perform several GraphQL queries, so we can handle them in a
custom fetch interceptor.

Let's define a helper method that handles cacheability of a GraphQL response:

::: code-group

```typescript [helpers/graphqlCacheability.ts]
import type { GraphqlResponseTyped } from '#nuxt-graphql-middleware/response'

export function handleGraphqlResponse(
  event: H3Event,
  response?: GraphqlResponseTyped,
) {
  if (import.meta.server) {
    // Get the cacheability.
    const cacheability = response?.extensions?.cacheability

    useCDNHeaders((cdn) => {
      // Mark as private in these cases.
      if (!cacheability || cacheability.isPrivate || !cacheability.maxAge) {
        return cdn.private()
      }

      // Set the cacheability.
      cdn
        .addTags(cacheability.cacheTags)
        .setNumeric('maxAge', cacheability.maxAge)
        .public()
    }, event)
  }
}
```

:::

And then use the helper in a `onResponse` fetch interceptor:

::: code-group

```typescript [plugins/graphqlState.ts]
import { handleGraphqlResponse } from '~/helpers/graphqlCacheability'

export default defineNuxtPlugin({
  name: 'custom-plugin:graphql-request',
  dependsOn: ['nuxt-graphql-middleware-provide-state'],
  setup() {
    if (import.meta.server) {
      const state = useGraphqlState()
      const event = useRequestEvent()

      if (!state) {
        throw new Error('GraphQL state not available.')
      }

      state.fetchOptions = {
        onResponse(ctx) {
          // Fully typed response.
          const response = ctx.response?._data
          handleGraphqlResponse(event, response)
        },
      }
    }
  },
})
```

:::

Now every GraphQL query performed during SSR will merge its cacheability with
the "primary" SSR response. By using `cdn.setNumeric`, which only sets the
maxAge if it's lower than the currently set maxAge, the maxAge of our response
will be the lowest maxAge of all queries. In addition, the response will contain
all combined cache tags from all GraphQL responses. And if any GraphQL response
is private, it will make the entire SSR response private as well.

## `useDataCache()`

You might want to cache certain GraphQL responses directly within the Nuxt app
during SSR. Common use cases are queries that are performed on every page, such
as loading global state, translations, menus, etc.

### Option 1: Create a helper composable

You can create a composable that wraps both `useGraphqlQuery` and `useDataCache`
to perform a query. We again use the `handleGraphqlResponse()` helper from
above.

```typescript
import type { Query } from '#nuxt-graphql-middleware/operation-types'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { handleGraphqlResponse } from '~/helpers/graphqlCacheability'

export async function useCachedGraphqlQuery<
  K extends keyof Query,
  R = Query[K]['response'],
>(name: K): Promise<R> {
  // Caching only handled on server side.
  if (import.meta.server) {
    const language = useCurrentLanguage()
    const event = useRequestEvent()
    // Make sure to create a key that correctly varies for the current
    // request. In particular, make sure to consider:
    // - Authentication, e.g. via cookie
    // - Langauge: If set using a onRequest interceptor for example
    const key = name + language.value

    const { value, addToCache } = await useDataCache<GraphqlResponse<R>>(
      key,
      event,
    )

    // Important: If we use both data cache and useCDNHeaders() we need to
    // make sure our SSR response still inherits the cacheability.
    if (value) {
      handleGraphqlResponse(event, value)
      // Directly return the query response.
      return value.data
    }

    const response = await useGraphqlQuery(name)
    handleGraphqlResponse(event, response)
    const { isPrivate, cacheTags, maxAge } = response
    if (!isPrivate && maxAge) {
      await addToCache(response, cacheTags, maxAge)
    }

    return response.data
  }

  // On the client side we can directly perform the query.
  const response = await useGraphqlQuery(name, null, {
    // Optional: Cache on client side.
    graphqlCaching: {
      client: true,
    },
  })

  return response.data
}
```

You can now use this composable in a plugin or component:

```vue
<script lang="ts" setup>
const { data } = useAsyncData(() => useCachedGraphqlQuery('loadMenuLinks'))
</script>
```

### Option 2: Cache on the middleware

This is a more complex approach that directly caches GraphQL responses on the
server. The benefit of this approach is that it caches both requests during SSR
_and_ requests coming from a browser.

Currently, the only way to achieve this is to implement the `doGraphqlRequest`
in your server options. Doing so will skip all other methods defined on the
server options - you are basically required to make the request entirely
yourself. However this opens the possibility to implement caching on this level.
