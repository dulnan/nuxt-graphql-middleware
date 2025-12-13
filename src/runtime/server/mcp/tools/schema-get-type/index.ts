import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import { getSchemaTypeOutputSchema, type GetSchemaTypeResponse } from './types'

export const getSchemaTypeTool = defineMcpTool({
  name: 'schema-get-type',
  title: 'Get Schema Type',
  description:
    'Get detailed information about a GraphQL type from the schema. Returns the type kind (OBJECT, INPUT_OBJECT, ENUM, UNION, INTERFACE, SCALAR), description, fields with their types, enum values, possible types for unions, and implemented interfaces.',
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
        'The name of the GraphQL type to inspect (e.g., "User", "CreateUserInput", "UserRole")',
      ),
  },
  outputSchema: getSchemaTypeOutputSchema,
  handler: async ({ typeName }) => {
    const response = await fetchFromMcpHandler<GetSchemaTypeResponse>(
      'schema-get-type',
      { name: typeName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult(response.type!)
  },
})
