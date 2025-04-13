# Module Utils

These utils can be imported from `nuxt-graphql-middleware/utils`.

::: warning

These utils can **only** be used in other modules. Importing them in any other
place will not work.

:::

## `useGraphqlModuleContext()`

This util exposes the `ModuleContext` instance of `nuxt-graphql-middleware`.
It's the same instance also available from [hooks](/configuration/module-hooks).

### Example

In this example the module conditionally enables features based on the existance
of certain types and fields in the schema.

```typescript
import { defineNuxtModule } from '@nuxt/kit'
import { useGraphqlModuleContext } from 'nuxt-graphql-middleware/utils'
import { isObjectType } from 'graphql'

type Feature = 'comments' | 'blog' | 'analytics'

export default defineNuxtModule({
  meta: {
    name: 'my-custom-module',
  },
  setup(_options, nuxt) {
    const enabledFeatures: Feature[] = []

    const context = useGraphqlModuleContext()

    // Feature is available if this type exists.
    if (context.schemaHasType('Comment')) {
      enabledFeatures.push('comments')
    }

    // Feature is available if a mutation called "trackPageView" exists.
    const Mutation = context.schemaGetType('Mutation')
    if (isObjectType(Mutation)) {
      const fields = Mutation.getFields()
      if (fields.trackPageView) {
        enabledFeatures.push('analytics')
      }
    }
  },
})
```
