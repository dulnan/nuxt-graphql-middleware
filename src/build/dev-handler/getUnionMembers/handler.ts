import { isUnionType, type GraphQLSchema } from 'graphql'
import type { GetUnionMembersResponse } from '../../../runtime/server/mcp/tools/schema-get-union-members/types'

export function handleGetUnionMembers(
  schema: GraphQLSchema,
  unionName: string,
): GetUnionMembersResponse {
  const unionType = schema.getType(unionName)

  if (!unionType) {
    return {
      unionName,
      members: [],
      error: `Type "${unionName}" not found in schema`,
    }
  }

  if (!isUnionType(unionType)) {
    return {
      unionName,
      members: [],
      error: `Type "${unionName}" is not a union`,
    }
  }

  const memberTypes = unionType.getTypes()

  const members = memberTypes.map((type) => ({
    name: type.name,
    description: type.description || null,
  }))

  // Sort alphabetically
  members.sort((a, b) => a.name.localeCompare(b.name))

  return { unionName, members }
}
