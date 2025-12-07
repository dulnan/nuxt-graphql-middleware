import { parse, Source } from 'graphql'
import { validateGraphQlDocuments } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'
import type { ValidateDocumentResponse } from './types'

export function handleValidateDocument(
  schema: GraphQLSchema,
  documentSource: string,
): ValidateDocumentResponse {
  try {
    const source = new Source(documentSource, 'input')
    const document = parse(source)
    const errors = validateGraphQlDocuments(schema, [document])

    if (errors.length === 0) {
      return {
        valid: true,
        errors: [],
      }
    }

    return {
      valid: false,
      errors: errors.map((error) => ({
        message: error.message,
        locations: error.locations?.map((loc) => ({
          line: loc.line,
          column: loc.column,
        })),
      })),
    }
  } catch (error) {
    // Handle parse errors (syntax errors)
    const message =
      error instanceof Error ? error.message : 'Unknown parsing error'

    // Try to extract location from GraphQL parse errors
    const locations =
      error &&
      typeof error === 'object' &&
      'locations' in error &&
      Array.isArray((error as { locations?: unknown[] }).locations)
        ? (
            error as { locations: Array<{ line: number; column: number }> }
          ).locations.map((loc) => ({
            line: loc.line,
            column: loc.column,
          }))
        : undefined

    return {
      valid: false,
      errors: [{ message, locations }],
    }
  }
}
