# Caching

nuxt-graphql-middleware ships with a client-side cache feature that allows you
to cache individual queries in the browser. The cache is in-memory, so a refresh
automatically "purges" the cache.

Caching is opt-in, meaning by default nothing is cached.

## Configuration

```typescript
export default defineNuxtConfig({
  graphqlMiddleware: {
    clientCache: {
      // Enable or disable the caching feature.
      enabled: true,
      // Cache a maximum of 50 queries (default: 100).
      maxSize: 50,
    }
  }
}
```

## Usage

In both composables the cache key is automatically derived from:

- operation type
- operation name
- operation variables
- (if available) the client context built in
  [client options](/configuration/client-options)

### useAsyncGraphqlQuery

To opt-in to client side caching, set `client: true` on the `graphqlCaching`
property in the options argument:

```typescript
const { data } = await useAsyncGraphqlQuery('users', null, {
  graphqlCaching: {
    client: true,
  },
})
```

### useGraphqlQuery

To opt-in to client side caching, set `client: true` on the `graphqlCaching`
property in the options argument:

```typescript
const data = await useGraphqlQuery('users', null, {
  graphqlCaching: {
    client: true,
  },
})
```

Now, the result of the `users` query is stored in memory and any subsequent call
will resolve the cached response.

In addition, if using SSR, the composable will return the response from the
payload, even when navigating back and forth between a SSR and SPA page.

## Cache Key

The cache key is automatically generated using the provided arguments:

- name of the query
- fetch params (query parameters, includes variables)

Note that this _does not_ include any other factors that may alter the exact
response! For example, if you use the `useGraphqlState()` feature to define
custom request headers (such as the current language), when the language
changes, the composable will continue to return cached queries for the previous
language. To prevent this, you have to vary the cache key, by either:

- providing the language as part of the variables
- append the language as part of the fetch params (either using `fetchOptions`
  in the composable options or setting global `fetchOptions` via
  `useGraphqlState()`)

## Purging the cache

The composable creates the cache instance as a property on `NuxtApp`. This
instance is created the first time a cacheable query is made, therefore this
property may be nullable.

You can purge all cached queries using something like this:

```typescript
const app = useNuxtApp()

if (app.$graphqlCache) {
  app.$graphqlCache.purge()
}
```

## Disable caching

The module uses
[app config](https://nuxt.com/docs/guide/directory-structure/app-config), so you
can enable or disable the client cache in a plugin:

```typescript
export default defineNuxtPlugin((NuxtApp) => {
  const appConfig = useAppConfig()
  appConfig.graphqlMiddleware.clientCacheEnabled = false
}
```

## Caching on the server

Currently caching is not supported server side, but you can easily implement it
yourself using the `doGraphqlRequest` server option method:

```typescript
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import { hash } from 'ohash'

const storage = createStorage({
  driver: memoryDriver(),
})

export default defineGraphqlServerOptions({
  async doGraphqlRequest({
    event,
    operation,
    operationName,
    operationDocument,
    variables,
  }) {
    const key = `${operation}:${operationName}:${hash(variables)}`
    const cached = await storage.getItem(key)

    // Get a cached response.
    if (cached) {
      return cached
    }

    const result = await $fetch.raw('https://example.com/graphql', {
      method: 'POST'
      body: {
        query: operationDocument,
        variables,
        operationName
      },
      headers: {
        'custom-header': 'foobar'
      }
    })

    // Store item in cache.
    storage.setItem(key, result._data)

    return result._data
  }
})
```

That way you can also customise the exact behaviour, e.g. only cache certain
queries by name, vary by cookie/session or handle `Set-Cookie` headers from your
backend.
