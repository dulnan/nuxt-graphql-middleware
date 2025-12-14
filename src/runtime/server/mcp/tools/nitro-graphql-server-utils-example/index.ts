import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  serverUtilExamplesOutputSchema,
  type GetServerUtilExamplesResponse,
} from './types'

export const nitroGraphqlServerUtilsExampleTool = defineMcpTool({
  name: 'nitro-graphql-server-utils-example',
  title: 'Nitro GraphQL Server Utils Examples',
  description:
    'Generate usage examples for Nitro server utils (useGraphqlQuery, useGraphqlMutation, doGraphqlRequest) for a specific GraphQL operation. Returns code examples with mock variable data for use in Nitro event handlers and server-side code.',
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
        'The name of the GraphQL operation to generate examples for (e.g., "getUsers", "createPost")',
      ),
  },
  outputSchema: serverUtilExamplesOutputSchema,
  handler: async ({ operationName }) => {
    const response = await fetchFromMcpHandler<GetServerUtilExamplesResponse>(
      'nitro-graphql-server-utils-example',
      { name: operationName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({
      examples: response.examples,
      imports: response.imports,
    })
  },
})
