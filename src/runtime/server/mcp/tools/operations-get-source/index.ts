import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  getOperationSourceOutputSchema,
  type GetOperationSourceResponse,
} from './types'

export const getOperationSourceTool = defineMcpTool({
  name: 'operations-get-source',
  title: 'Get Operation Source',
  description:
    'Get the raw GraphQL source code of an operation. Returns the full GraphQL query or mutation including any inlined fragment definitions.',
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
        'The name of the GraphQL operation to get the source for (e.g., "getUsers", "createPost")',
      ),
  },
  outputSchema: getOperationSourceOutputSchema,
  handler: async ({ operationName }) => {
    const response = await fetchFromMcpHandler<GetOperationSourceResponse>(
      'operations-get-source',
      { name: operationName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({ source: response.source! })
  },
})
