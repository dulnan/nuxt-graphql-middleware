import { defineGeneratorTemplate } from './../defineTemplate'

/**
 * Exports a single opject containing the compiled queries and mutations.
 */
export default defineGeneratorTemplate(
  { path: 'nuxt-graphql-middleware/documents', virtual: true },
  (output, helper) => {
    return output
      .getOperationsFile({
        exportName: 'documents',
        minify: !helper.isDev,
      })
      .getSource()
  },
  () => {
    return `
import type { Query, Mutation, Subscription } from './operation-types'

declare module '#nuxt-graphql-middleware/documents' {
  export type Documents = {
    query: Record<keyof Query, string>
    mutation: Record<keyof Mutation, string>
    subscription: Record<keyof Subscription, string>
  }
  export const documents: Documents
}`
  },
)
