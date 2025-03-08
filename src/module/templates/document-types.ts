export function generateDocumentTypesTemplate() {
  return `
import type { Query, Mutation } from './operations'

declare module '#graphql-documents' {
  export type Documents = {
    query: Record<keyof Query, string>
    mutation: Record<keyof Mutation, string>
  }
  export const documents: Documents
}`
}
