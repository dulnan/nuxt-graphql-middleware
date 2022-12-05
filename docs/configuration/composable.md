# Composable configuration

If you use the provided `useGraphqlQuery`/`useGraphqlMutation` composables, you
can use the `useGraphqlState` composable to set custom fetch options.

Nuxt's $fetch uses [ofetch](https://github.com/unjs/ofetch) behind the
scenes, so check out their documentation for all available options.

Configuration is usually done by creating a [Nuxt
plugin](https://v3.nuxtjs.org/guide/directory-structure/plugins/) in your app
that loads and sets the configuration. This can technically also be done
anywhere in your app (e.g. in page components), but it is advised to only do
this in a single place (the plugin).

## Example: Pass a static custom headers
In this example a static header value is set which will be sent for every
request initiated by this module's composables to the server route.

```typescript
// plugins/graphqlConfig.ts

export default defineNuxtPlugin((NuxtApp) => {
  // Get the configuration state.
  const state = useGraphqlState()

  state.value.fetchOptions = {
    headers: {
      CustomHeader: 'foobar',
    },
  }
}
```

## Example: Alter the request using interceptors

By using ofetch's [`onRequest`
interceptor](https://github.com/unjs/ofetch#onrequest-request-options-) you
can alter the request right before it is made.

In this example a query parameter is added to every request. Useful if you use
an HTTP cache and want to make sure that after deploying a new release (that
changes the build hash), all requests to the server route won't be served from
cache.

```typescript
// plugins/graphqlConfig.ts

export default defineNuxtPlugin((NuxtApp) => {
  const state = useGraphqlState()

  // A hash generated at build time and passed in publicRuntimeConfig.
  const { buildHash } = useRuntimeConfig()

  state.value.fetchOptions = {
    async onRequest({ request, options }) {
      if (!options.params) {
        options.params = {}
      }
      options.params.hash = buildHash
    },
  }
}
```
