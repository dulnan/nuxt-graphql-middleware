import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import { getOperationOutputSchema, type GetOperationResponse } from './types'

export const getOperationTool = defineMcpTool({
  name: 'operations-get',
  title: 'Get Operation',
  description:
    'Get detailed information about a specific GraphQL operation (query or mutation). Returns the operation name, type, file path, variable requirements, TypeScript type names, and full GraphQL source code.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    operationName: z
      .string()
      .describe(
        'The name of the GraphQL operation to get details for (e.g., "getUsers", "createPost")',
      ),
  },
  outputSchema: getOperationOutputSchema,
  handler: async ({ operationName }) => {
    const response = await fetchFromMcpHandler<GetOperationResponse>(
      'operations-get',
      { name: operationName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    const op = response.operation!
    return structuredResult({
      name: op.name,
      type: op.type,
      filePath: op.relativeFilePath,
      hasVariables: op.hasVariables,
      needsVariables: op.needsVariables,
      variablesTypeName: op.variablesTypeName,
      responseTypeName: op.responseTypeName,
      source: op.source,
    })
  },
})
