# useGraphqlQuery()

::: warning

While this util has the same name as the composable it's a completely separate
method. In particular, it **does not use** any state set using the
`useGraphqlState` composable or the `graphqlMiddleware.clientOptions.ts` file.

:::

This util is auto-imported and available in a server (nitro) context. It's
function signature is identical to the
[useGraphqlQuery composable](/composables/useGraphqlQuery) composable available
in a Nuxt app context.

## Example

```typescript
export default defineEventHandler(async () => {
  const data = await useGraphqlQuery('users')
  return data.data.users.map((v) => v.email)
})
```

## Client Context

Since the client context returned in
[buildClientContext()](/configuration/client-options) is only available in a
Nuxt app context you can manually pass the context when making a query with the
server util:

```typescript
export default defineEventHandler(async () => {
  const data = await useGraphqlQuery({
    name: 'users',
    clientContext: {
      language: 'de',
    },
  })
  return data.data.users.map((v) => v.email)
})
```
