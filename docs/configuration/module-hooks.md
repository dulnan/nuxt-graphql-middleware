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
