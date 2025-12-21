import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import { getTypeUsageOutputSchema, type GetTypeUsageResponse } from './types'

export const getTypeUsageTool = defineMcpTool({
  name: 'schema-get-type-usage',
  title: 'Get Type Usage',
  description:
    'Find all places where a GraphQL type is used in the schema. Shows where a type appears as a field return type, argument type, or input field type.',
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
        'The name of the GraphQL type to find usages for (e.g., "User", "ID", "DateTime")',
      ),
  },
  outputSchema: getTypeUsageOutputSchema,
  handler: async ({ typeName }) => {
    const response = await fetchFromMcpHandler<GetTypeUsageResponse>(
      'schema-get-type-usage',
      { name: typeName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({
      typeName: response.typeName,
      count: response.usages.length,
      usages: response.usages,
    })
  },
})
