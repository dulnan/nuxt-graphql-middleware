import { z } from 'zod'
import { devServerUrl } from '#nuxt-graphql-middleware/mcp'
import type { GraphqlServerResponse } from '../../../types'

/**
 * Shared Zod schema for GraphQL errors.
 */
export const GraphqlErrorSchema = z.object({
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

/**
 * Shared output schema for GraphQL execution results.
 */
export const graphqlExecutionOutputSchema = {
  data: z
    .record(z.string(), z.unknown())
    .nullable()
    .describe('The GraphQL response data, or null if the request failed'),
  errors: z
    .array(GraphqlErrorSchema)
    .optional()
    .describe('GraphQL errors if any occurred'),
}

/**
 * Extracts GraphQL error response from a fetch error.
 */
export function extractErrorResponse(
  e: unknown,
): GraphqlServerResponse<any> | null {
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

/**
 * Fetches data from the MCP dev handler using POST.
 */
export async function fetchFromMcpHandler<T>(
  tool: string,
  params?: Record<string, unknown>,
): Promise<T> {
  return await $fetch<T>(`${devServerUrl}/__nuxt_graphql_middleware/mcp`, {
    method: 'POST',
    body: { tool, ...params },
  })
}

/**
 * Creates an MCP tool result with both content (for backwards compatibility)
 * and structuredContent (required when outputSchema is defined).
 */
export function structuredResult<T extends Record<string, unknown>>(data: T) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  }
}
