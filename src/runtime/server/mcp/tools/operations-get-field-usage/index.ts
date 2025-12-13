import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  getFieldUsageOutputSchema,
  type GetFieldUsageResponse,
} from './types'

export const getFieldUsageTool = defineMcpTool({
  name: 'operations-get-field-usage',
  title: 'Get Field Usage',
  description:
    'Find all operations and fragments where a specific field on a GraphQL type is used. Useful for impact analysis when modifying or deprecating fields.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    typeName: z
      .string()
      .describe(
        'The name of the GraphQL type (e.g., "Query", "User", "Article")',
      ),
    fieldName: z
      .string()
      .describe(
        'The name of the field to find usages for (e.g., "search", "id", "email")',
      ),
  },
  outputSchema: getFieldUsageOutputSchema,
  handler: async ({ typeName, fieldName }) => {
    const response = await fetchFromMcpHandler<GetFieldUsageResponse>(
      'operations-get-field-usage',
      { typeName, fieldName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({
      typeName: response.typeName,
      fieldName: response.fieldName,
      count: response.usages.length,
      usages: response.usages,
    })
  },
})
