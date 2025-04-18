import { defineGeneratorTemplate } from './../defineTemplate'

/**
 * Contains the TS definitions for all GraphQL queries, mutations and fragments.
 */
export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/operation-types' },
  () => `export {}`,
  (output) => {
    return output
      .getOperationTypesFile({
        importFrom: './../graphql-operations',
      })
      .getSource()
  },
)
