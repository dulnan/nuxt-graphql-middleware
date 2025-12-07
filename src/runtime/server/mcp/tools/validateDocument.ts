import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../utils'
import {
  validateDocumentOutputSchema,
  type ValidateDocumentResponse,
} from '../../../../build/dev-handler/validateDocument/types'

export const validateDocumentTool = defineMcpTool({
  name: 'schema-validate-document',
  title: 'Validate Document',
  description:
    'Validate a raw GraphQL document against the schema. Checks for syntax errors, unknown fields, type mismatches, and other validation issues. Use this to verify a GraphQL query, mutation, or fragment before saving it to a file.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    document: z
      .string()
      .describe('The raw GraphQL document source to validate'),
  },
  outputSchema: validateDocumentOutputSchema,
  handler: async (args) => {
    const response = await fetchFromMcpHandler<ValidateDocumentResponse>(
      'schema-validate-document',
      { document: args.document },
    )

    return structuredResult({
      valid: response.valid,
      errors: response.errors,
    })
  },
})
