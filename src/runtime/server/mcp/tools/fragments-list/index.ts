import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../../utils'
import {
  listFragmentsOutputSchema,
  type ListFragmentsResponse,
} from './types'

export const listFragmentsTool = defineMcpTool({
  name: 'fragments-list',
  title: 'List Fragments',
  description:
    'List all GraphQL fragments available in the project. Returns fragment names, the types they are defined on, and file paths.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  outputSchema: listFragmentsOutputSchema,
  handler: async () => {
    const response =
      await fetchFromMcpHandler<ListFragmentsResponse>('fragments-list')

    const summary = response.fragments.map((frag) => ({
      name: frag.name,
      typeName: frag.typeName,
      filePath: frag.relativeFilePath,
    }))

    return structuredResult({
      count: response.fragments.length,
      fragments: summary,
    })
  },
})
