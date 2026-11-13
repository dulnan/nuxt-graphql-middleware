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

The `graphqlCaching.client` option has no effect if the client cache is
disabled.

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

A cached response is returned right away, without a `pending` status. It is only
returned for the same request: if the variables or the client context differ,
the query is performed again.

If using SSR, the responses from the payload are stored in the cache during
hydration, for the request that the server made. When navigating back to the
page, the composable returns them from the cache, as long as they are still in
it.

The data of a cached response depends on the `transform` and `pick` options:

- For a response that was fetched in the browser, the `transform` of the call
  runs on the cached response right away, during the `useAsyncGraphqlQuery()`
  call. Define what the `transform` uses before the call.
- A response from the payload is only returned to the call that made it: the
  same `useAsyncGraphqlQuery()` in your code, with the same `transform` and
  `pick`.

Treat the `data` of a cached response as read-only. Without a `transform`, or
with one that returns part of the response, it's the cached object, which all
calls with the same request share.

Values that a `transform` reads from elsewhere, such as props, are not part of
the cache key, just as they are not part of the key of Nuxt's `useAsyncData`. On
one page, Nuxt already shares the data of two calls with the same query and
variables. On a later visit, the cache returns the response from the payload,
which the `transform` made with the values of the first visit. Pass such values
as variables, or apply them in a `computed`:

```typescript
const props = defineProps<{ limit: number }>()

const { data } = await useAsyncGraphqlQuery('articles', null, {
  transform: (v) => v.data.articles,
  graphqlCaching: {
    client: true,
  },
})

const articles = computed(() => data.value?.slice(0, props.limit))
```

With Nuxt's default `experimental.granularCachedData`, calling `refresh()` skips
the cache and performs the query again. With the option turned off, it returns
the cached response.

Some cases don't use the cache right away:

- With an `async` transform or Nuxt's `middleware` option, a response that was
  fetched in the browser goes through its cached request: no request is made,
  but the status is `pending` for a moment.
- A trigger of the `watch` option also goes through the cached request. A
  response from the SSR payload has none, so the query is performed again.
- Like in Nuxt, a component with delayed hydration (such as
  `hydrate-on-visible`) performs the query when it hydrates. The payload is only
  used while the page hydrates.

Declare a `transform` that returns a promise as `async`. Otherwise it runs twice
on the first cache hit of its call.

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

The server and the browser must build the same fetch params, including the
global ones from `useGraphqlState()`: the browser stores a response from the SSR
payload for the request that the server made. If they differ, the first revisit
of each query performs it again.

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

This also removes the responses stored from the SSR payload, so the composables
perform the queries again.

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
