import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../utils'
import {
  getTypesImplementingInterfaceOutputSchema,
  type GetTypesImplementingInterfaceResponse,
} from '../../../../build/dev-handler/getTypesImplementingInterface/types'

export const getTypesImplementingInterfaceTool = defineMcpTool({
  name: 'schema-get-interface-implementors',
  title: 'Get Interface Implementors',
  description:
    'Get all object types that implement a given GraphQL interface. Returns the implementing type names and descriptions.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    interfaceName: z
      .string()
      .describe(
        'The name of the GraphQL interface (e.g., "Node", "Connection")',
      ),
  },
  outputSchema: getTypesImplementingInterfaceOutputSchema,
  handler: async ({ interfaceName }) => {
    const response =
      await fetchFromMcpHandler<GetTypesImplementingInterfaceResponse>(
        'schema-get-interface-implementors',
        { name: interfaceName },
      )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({
      interfaceName: response.interfaceName,
      count: response.types.length,
      types: response.types,
    })
  },
})
