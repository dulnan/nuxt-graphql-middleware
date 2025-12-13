import { z } from 'zod'

export const ValidateDocumentRequestSchema = z.object({
  document: z.string().describe('The raw GraphQL document source to validate'),
})

const ValidationErrorSchema = z.object({
  message: z.string().describe('The error message'),
  locations: z
    .array(
      z.object({
        line: z.number().describe('Line number (1-indexed)'),
        column: z.number().describe('Column number (1-indexed)'),
      }),
    )
    .optional()
    .describe('Source locations where the error occurred'),
})

export const ValidateDocumentResponseSchema = z.object({
  valid: z.boolean().describe('Whether the document is valid'),
  errors: z
    .array(ValidationErrorSchema)
    .describe('List of validation errors, empty if valid'),
})

export const validateDocumentOutputSchema = {
  valid: z.boolean().describe('Whether the document is valid'),
  errors: z
    .array(ValidationErrorSchema)
    .describe('List of validation errors, empty if valid'),
}

export type ValidateDocumentRequest = z.infer<
  typeof ValidateDocumentRequestSchema
>
export type ValidateDocumentResponse = z.infer<
  typeof ValidateDocumentResponseSchema
>
