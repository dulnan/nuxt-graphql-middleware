import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  listOperationsOutputSchema,
  OperationTypeFilterSchema,
  type ListOperationsResponse,
} from './types'

export const listOperationsTool = defineMcpTool({
  name: 'operations-list',
  title: 'List Operations',
  description:
    'List all GraphQL operations (queries and mutations) available in the project. Returns operation names, types, file paths, and variable requirements.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    nameFilter: z
      .string()
      .optional()
      .describe(
        'Optional filter to match operation names. Can be a plain string for substring matching or a regex pattern (e.g., "^get" to match names starting with "get")',
      ),
    type: OperationTypeFilterSchema.optional().describe(
      'Optional filter by operation type: "query" or "mutation"',
    ),
  },
  outputSchema: listOperationsOutputSchema,
  handler: async ({ nameFilter, type }) => {
    const response = await fetchFromMcpHandler<ListOperationsResponse>(
      'operations-list',
      { nameFilter, type },
    )

    const summary = response.operations.map((op) => ({
      name: op.name,
      type: op.type,
      filePath: op.relativeFilePath,
      hasVariables: op.hasVariables,
      needsVariables: op.needsVariables,
      variablesTypeName: op.variablesTypeName,
      responseTypeName: op.responseTypeName,
    }))

    return structuredResult({
      count: response.operations.length,
      operations: summary,
    })
  },
})
