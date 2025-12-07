import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../utils'
import {
  getFragmentSourceOutputSchema,
  type GetFragmentSourceResponse,
} from '../../../../build/dev-handler/getFragmentSource/types'

export const getFragmentSourceTool = defineMcpTool({
  name: 'fragments-get-source',
  title: 'Get Fragment Source',
  description:
    'Get the raw GraphQL source code of a fragment. Returns just the GraphQL fragment definition.',
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
  },
  outputSchema: getFragmentSourceOutputSchema,
  handler: async ({ fragmentName }) => {
    const response = await fetchFromMcpHandler<GetFragmentSourceResponse>(
      'fragments-get-source',
      { name: fragmentName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({ source: response.source! })
  },
})
