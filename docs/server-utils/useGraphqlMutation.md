# useGraphqlMutation()

::: warning

While this util has the same name as the composable it's a completely separate
method. In particular, it **does not use** any state set using the
`useGraphqlState` composable or the `graphqlMiddleware.clientOptions.ts` file.

:::

This util is auto-imported and available in a server (nitro) context. It's
function signature is identical to the
[useGraphqlMutation composable](/composables/useGraphqlMutation) composable
available in a Nuxt app context.

## Example

```typescript
import { getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getQuery(event).id
  const data = await useGraphqlMutation('trackVisit', {
    id,
  })
  return data.data.success
})
```

## Client Context

Since the client context returned in
[buildClientContext()](/configuration/client-options) is only available in a
Nuxt app context you can manually pass the context when making a mutation with
the server util:

```typescript
import { getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getQuery(event).id
  const data = await useGraphqlMutation({
    name: 'trackVisit',
    variables: {
      id,
    },
    clientContext: {
      language: 'de',
    },
  })
  return data.data.success
})
```
