import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  getSchemaTypeDefinitionOutputSchema,
  type GetSchemaTypeDefinitionResponse,
} from './types'

export const getSchemaTypeDefinitionTool = defineMcpTool({
  name: 'schema-get-type-definition',
  title: 'Get Type Definition',
  description:
    'Get the full SDL (Schema Definition Language) definition of a GraphQL type. Returns the complete type definition as it appears in the schema, including all fields, arguments, directives, and descriptions.',
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
        'The name of the GraphQL type to get the definition for (e.g., "User", "CreateUserInput", "UserRole")',
      ),
  },
  outputSchema: getSchemaTypeDefinitionOutputSchema,
  handler: async ({ typeName }) => {
    const response = await fetchFromMcpHandler<GetSchemaTypeDefinitionResponse>(
      'schema-get-type-definition',
      { name: typeName },
    )

    return structuredResult({
      definition: response.definition,
      error: response.error,
    })
  },
})
