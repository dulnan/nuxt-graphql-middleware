import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { serverApiPrefix } from '#nuxt-graphql-middleware/helpers'
import { devServerUrl } from '#nuxt-graphql-middleware/mcp'
import {
  structuredResult,
  graphqlExecutionOutputSchema,
  extractErrorResponse,
} from './../../utils'

export const executeOperationTool = defineMcpTool({
  name: 'operations-execute',
  title: 'Execute Operation',
  description:
    'Execute an existing GraphQL operation (query or mutation) by name via the middleware. This sends a real request through the configured middleware and returns the response. Use this to test existing operations or fetch data.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    type: z
      .enum(['query', 'mutation'])
      .describe('The type of operation to execute'),
    name: z
      .string()
      .describe(
        'The name of the GraphQL operation to execute (e.g., "getUsers", "createPost")',
      ),
    variables: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Optional variables to pass to the GraphQL operation'),
  },
  outputSchema: graphqlExecutionOutputSchema,
  handler: async ({ type, name, variables }) => {
    const isQuery = type === 'query'
    const method = isQuery ? 'GET' : 'POST'
    const endpoint = `${devServerUrl}${serverApiPrefix}/${type}/${name}`

    try {
      const fetchOptions: Record<string, unknown> = {
        method,
      }

      if (isQuery && variables && Object.keys(variables).length > 0) {
        // For queries, encode variables as query params
        // Use __variables for complex types to ensure proper handling
        fetchOptions.params = {
          __variables: JSON.stringify(variables),
        }
      } else if (!isQuery && variables) {
        // For mutations, send variables in the body
        fetchOptions.body = variables
      }

      const response = await $fetch<{
        data?: Record<string, unknown> | null
        errors?: Array<{ message: string }>
      }>(endpoint, fetchOptions)

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
