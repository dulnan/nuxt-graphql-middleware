import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  getFragmentOutputSchema,
  type GetFragmentResponse,
} from './types'

export const getFragmentTool = defineMcpTool({
  name: 'fragments-get',
  title: 'Get Fragment',
  description:
    'Get detailed information about a specific GraphQL fragment. Returns the fragment name, the type it is defined on, file path, source code, and dependencies on other fragments.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    fragmentName: z
      .string()
      .describe('The name of the GraphQL fragment to get details for'),
  },
  outputSchema: getFragmentOutputSchema,
  handler: async ({ fragmentName }) => {
    const response = await fetchFromMcpHandler<GetFragmentResponse>(
      'fragments-get',
      { name: fragmentName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    const frag = response.fragment!
    return structuredResult({
      name: frag.name,
      typeName: frag.typeName,
      filePath: frag.relativeFilePath,
      source: frag.source,
      dependencies: frag.dependencies,
    })
  },
})
