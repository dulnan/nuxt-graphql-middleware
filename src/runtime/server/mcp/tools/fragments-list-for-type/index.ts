import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  getFragmentsForTypeOutputSchema,
  type GetFragmentsForTypeResponse,
} from './types'

export const getFragmentsForTypeTool = defineMcpTool({
  name: 'fragments-list-for-type',
  title: 'List Fragments for Type',
  description:
    'Get all GraphQL fragments defined for a specific type. Returns fragment names, file paths, source code, and dependencies on other fragments.',
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
        'The name of the GraphQL type to get fragments for (e.g., "User", "Post")',
      ),
  },
  outputSchema: getFragmentsForTypeOutputSchema,
  handler: async ({ typeName }) => {
    const response = await fetchFromMcpHandler<GetFragmentsForTypeResponse>(
      'fragments-list-for-type',
      { name: typeName },
    )

    if (response.error) {
      return structuredResult({ fragments: [], error: response.error })
    }

    const fragments = response.fragments.map((frag) => ({
      name: frag.name,
      typeName: frag.typeName,
      filePath: frag.relativeFilePath,
      source: frag.source,
      dependencies: frag.dependencies,
    }))

    return structuredResult({ fragments })
  },
})
