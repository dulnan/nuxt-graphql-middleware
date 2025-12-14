import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  composableExamplesOutputSchema,
  type GetComposableExamplesResponse,
} from './types'

export const vueGraphqlComposableExampleTool = defineMcpTool({
  name: 'vue-graphql-composable-example',
  title: 'Vue GraphQL Composable Examples',
  description:
    'Generate usage examples for Vue composables (useGraphqlQuery, useAsyncGraphqlQuery, useGraphqlMutation, etc.) for a specific GraphQL operation. Returns code examples with mock variable data.',
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
  outputSchema: composableExamplesOutputSchema,
  handler: async ({ operationName }) => {
    const response = await fetchFromMcpHandler<GetComposableExamplesResponse>(
      'vue-graphql-composable-example',
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
