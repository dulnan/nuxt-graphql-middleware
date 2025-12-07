import { z } from 'zod'
import { defineMcpTool } from '#imports'
import { fetchFromMcpHandler, structuredResult } from './../utils'
import {
  getUnionMembersOutputSchema,
  type GetUnionMembersResponse,
} from '../../../../build/dev-handler/getUnionMembers/types'

export const getUnionMembersTool = defineMcpTool({
  name: 'schema-get-union-members',
  title: 'Get Union Members',
  description:
    'Get all types that are members of a GraphQL union. Returns the member type names and descriptions.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    unionName: z
      .string()
      .describe('The name of the GraphQL union (e.g., "SearchResult")'),
  },
  outputSchema: getUnionMembersOutputSchema,
  handler: async ({ unionName }) => {
    const response = await fetchFromMcpHandler<GetUnionMembersResponse>(
      'schema-get-union-members',
      { name: unionName },
    )

    if (response.error) {
      return structuredResult({ error: response.error })
    }

    return structuredResult({
      unionName: response.unionName,
      count: response.members.length,
      members: response.members,
    })
  },
})
