import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../utils'
import {
  listSchemaTypesOutputSchema,
  type ListSchemaTypesResponse,
} from '../../../../build/dev-handler/listSchemaTypes/types'

export const listSchemaTypesTool = defineMcpTool({
  name: 'schema-list-types',
  title: 'List Schema Types',
  description:
    'List all types in the GraphQL schema. Can be filtered by kind (OBJECT, INPUT_OBJECT, ENUM, UNION, INTERFACE, SCALAR). Returns type names, kinds, and descriptions.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    kind: z
      .enum(['OBJECT', 'INPUT_OBJECT', 'ENUM', 'UNION', 'INTERFACE', 'SCALAR'])
      .optional()
      .describe(
        'Optional filter by type kind. If not provided, returns all types.',
      ),
  },
  outputSchema: listSchemaTypesOutputSchema,
  handler: async ({ kind }) => {
    const params: Record<string, string> = {}
    if (kind) {
      params.kind = kind
    }

    const response = await fetchFromMcpHandler<ListSchemaTypesResponse>(
      'schema-list-types',
      Object.keys(params).length > 0 ? params : undefined,
    )

    return structuredResult({
      count: response.types.length,
      types: response.types,
    })
  },
})
