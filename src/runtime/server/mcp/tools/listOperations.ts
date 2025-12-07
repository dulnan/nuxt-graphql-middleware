import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../utils'
import {
  listOperationsOutputSchema,
  type ListOperationsResponse,
} from '../../../../build/dev-handler/listOperations/types'

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
  outputSchema: listOperationsOutputSchema,
  handler: async () => {
    const response =
      await fetchFromMcpHandler<ListOperationsResponse>('operations-list')

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
