import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { serverApiPrefix } from '#nuxt-graphql-middleware/helpers'
import { getDevServerUrl, structuredResult } from './../../utils'
import type { GraphqlServerResponse } from '~/src/runtime/types'

const GraphqlErrorSchema = z.object({
  message: z.string().describe('The error message'),
  locations: z
    .array(
      z.object({
        line: z.number().describe('Line number'),
        column: z.number().describe('Column number'),
      }),
    )
    .optional()
    .describe('Source locations where the error occurred'),
  path: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .describe('Path to the field that caused the error'),
  extensions: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional error metadata'),
})

const executeGraphqlOutputSchema = {
  data: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('The GraphQL response data, or null if the request failed'),
  errors: z
    .array(GraphqlErrorSchema)
    .optional()
    .describe('GraphQL errors if any occurred'),
}

function extractErrorResponse(e: unknown): GraphqlServerResponse<any> | null {
  if (
    typeof e === 'object' &&
    e &&
    'response' in e &&
    e.response &&
    typeof e.response === 'object' &&
    '_data' in e.response &&
    typeof e.response._data === 'object'
  ) {
    return e.response._data as GraphqlServerResponse<any>
  }

  return null
}

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
  outputSchema: executeGraphqlOutputSchema,
  handler: async ({ document, variables, operationName }) => {
    try {
      const baseUrl = getDevServerUrl()
      const response = await $fetch<{
        data?: Record<string, unknown> | null
        errors?: Array<{ message: string }>
      }>(`${baseUrl}${serverApiPrefix}/do-request`, {
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
