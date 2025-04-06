# useGraphqlState

This composable allows you to set fetch options for the useGraphqlQuery,
useAsyncGraphqlQuery and useGraphqlMutation composables. One common use case is
to pass custom request headers to the GraphQL middleware request.

::: warning

The state is only used for requests made from within a Nuxt app context (e.g.
pages, route middleware, etc.). Usually this is used to "pass" information from
the client/browser context to the middleware.

:::

::: code-group

```typescript [plugins/graphqlState.ts]
export default defineNuxtPlugin({
  name: 'my-state-plugin',
  // Makes sure that your plugin is executed after this plugin.
  // If it were to run before, then `state` would be null.
  dependsOn: ['nuxt-graphql-middleware-provide-state'],
  setup() {
    const state = useGraphqlState()

    // This is nullable because it's injected by a plugin.
    if (!state) {
      return
    }

    // Set fetch options for all GraphQL queries and mutations.
    state.fetchOptions = {
      headers: {
        CustomHeader: 'foobar',
      },
    }
  },
})
```

:::
