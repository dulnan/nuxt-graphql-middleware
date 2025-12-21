import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { serverApiPrefix } from '#nuxt-graphql-middleware/helpers'
import { devServerUrl } from '#nuxt-graphql-middleware/mcp'
import {
  structuredResult,
  graphqlExecutionOutputSchema,
  extractErrorResponse,
} from './../../utils'

export const executeGraphqlTool = defineMcpTool({
  name: 'graphql-execute',
  title: 'Execute GraphQL',
  description:
    'Execute an arbitrary GraphQL operation (query or mutation) against the configured GraphQL endpoint. This sends a real request to the GraphQL server and returns the response. Use this to test queries, fetch data, or perform mutations.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    document: z
      .string()
      .describe(
        'The GraphQL document (query or mutation) to execute. Must be a valid GraphQL operation.',
      ),
    variables: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Optional variables to pass to the GraphQL operation'),
    operationName: z
      .string()
      .optional()
      .describe(
        'Optional operation name if the document contains multiple operations',
      ),
  },
  outputSchema: graphqlExecutionOutputSchema,
  handler: async ({ document, variables, operationName }) => {
    try {
      const response = await $fetch<{
        data?: Record<string, unknown> | null
        errors?: Array<{ message: string }>
      }>(`${devServerUrl}${serverApiPrefix}/do-request`, {
        method: 'POST',
        body: {
          document,
          variables,
          operationName,
        },
      })

      return structuredResult({
        data: response?.data ?? null,
        errors: response?.errors,
      })
    } catch (error) {
      const fetchError = extractErrorResponse(error)

      // If the response contains GraphQL errors, return those
      if (fetchError) {
        return structuredResult({
          data: fetchError.data ?? null,
          errors: fetchError.errors,
        })
      }

      // Otherwise return a generic error
      const message =
        (error as any).statusMessage ||
        (error as any).message ||
        'Unknown error occurred'
      return structuredResult({
        data: null,
        errors: [{ message }],
      })
    }
  },
})
