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
    'Get the raw GraphQL source code of an operation. By default returns just the operation source. Set includeDependencies to true to include all fragment definitions the operation depends on.',
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
    includeDependencies: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'If true, includes all fragment definitions the operation depends on. Default is false.',
      ),
  },
  outputSchema: getOperationSourceOutputSchema,
  handler: async ({ operationName, includeDependencies }) => {
    const response = await fetchFromMcpHandler<GetOperationSourceResponse>(
      'operations-get-source',
      {
        name: operationName,
        includeDependencies: includeDependencies ?? false,
      },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({ source: response.source! })
  },
})
