import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  getFragmentSourceOutputSchema,
  type GetFragmentSourceResponse,
} from './types'

export const getFragmentSourceTool = defineMcpTool({
  name: 'fragments-get-source',
  title: 'Get Fragment Source',
  description:
    'Get the raw GraphQL source code of a fragment. By default returns just the fragment source. Set includeDependencies to true to include all fragment definitions this fragment depends on.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    fragmentName: z
      .string()
      .describe('The name of the GraphQL fragment to get the source for'),
    includeDependencies: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'If true, includes all fragment definitions this fragment depends on. Default is false.',
      ),
  },
  outputSchema: getFragmentSourceOutputSchema,
  handler: async ({ fragmentName, includeDependencies }) => {
    const response = await fetchFromMcpHandler<GetFragmentSourceResponse>(
      'fragments-get-source',
      { name: fragmentName, includeDependencies: includeDependencies ?? false },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({ source: response.source! })
  },
})
