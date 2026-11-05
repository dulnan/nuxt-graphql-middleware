# Module Hooks

You can hook into the module's build to add or alter the documents.

## `nuxt-graphql-middleware:init`

This hook is called right before processing the initial set of GraphQL
documents, after all modules have been initialised. It allows you to add
additional documents as strings.

### Example in `nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  hooks: {
    'nuxt-graphql-middleware:init': (ctx) => {
      ctx.addDocument(
        'queryFromHook',
        `query queryFromHook {
           users {
             id
           }
         }`,
      )
    },
  },
})
```

### Example in Custom Module

```typescript
import { defineNuxtModule, createResolver } from '@nuxt/kit'
import { fileURLToPath } from 'url'
import { isObjectType } from 'graphql'

const QUERY = `
query loadComments {
  comments {
    ...comment
  }
}
`

export default defineNuxtModule({
  meta: {
    name: 'nuxt-graphql-middleware-playground',
  },
  setup(_options, nuxt) {
    // Resolve files relative to this module.
    const resolver = createResolver(import.meta.url)

    nuxt.hooks.hookOnce('nuxt-graphql-middleware:init', (context) => {
      // Make sure the schema contains a required type.
      if (!context.schemaHasType('Comment')) {
        throw new Error('Module requires type "Comment" to exist.')
      }

      context.addDocument('queryFromModule', QUERY)

      // Add a document on disk via its absolute path.
      const filePath = resolver.resolve('./graphql/queryFromDisk.graphql')
      context.addImportFile(filePath)

      // Get a GraphQLNamedType from the schema.
      const type = context.schemaGetType('Comment')!
      if (!isObjectType(type)) {
        throw new Error('"Comment" should be an object type.')
      }

      // Check for existance of certain fields on a type.
      const fields = type.getFields()
      const hasAuthorField = !!fields.author

      // Add a fragment with conditional fields.
      context.addDocument(
        'commentFragmentFromModule',
        `fragment comment on Comment {
           ${hasAuthorField ? 'author' : ''}
           body
           subject
         }`,
      )
    })
  },
})
```

### Names of Definitions

The app can override a fragment or operation added by a module by defining one
with the same name (see [Nuxt Layers](/features/auto-import#nuxt-layers)). This
logs a warning, because the code of the module may rely on the fields of its
definition. If two modules add a definition with the same name, or the app adds
an operation of another type with the same name, the build fails.

To avoid accidental collisions, use specific names for the definitions of a
module, for example prefixed with the name of the module. If the app should be
able to replace a definition, provide an option to not add it.

## `nuxt-graphql-middleware:build`

This hook is called whenever the internal state of all GraphQL documents was
rebuilt. It receives a context object that contains a `output` property
containing the Generator output from
[graphql-typescript-deluxe](https://github.com/dulnan/graphql-typescript-deluxe).
It allows you to access all operations or fragments.

### Example in `nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  hooks: {
    'nuxt-graphql-middleware:build': (ctx) => {
      const fragments = ctx.output.getFragments()
      console.log('Collected Fragments')
      fragments.forEach((v) => {
        // v.node contains the FragmentDefinitionNode from 'graphql'.
        console.log(v.node.name.value)
      })
    },
  },
})
```
