import {
  isObjectType,
  isInputObjectType,
  isEnumType,
  isUnionType,
  isInterfaceType,
  isScalarType,
  type GraphQLSchema,
  type GraphQLNamedType,
} from 'graphql'
import type {
  SchemaTypeKindFilter,
  SchemaTypeSummary,
  ListSchemaTypesResponse,
} from '../../../runtime/server/mcp/tools/schema-list-types/types'

function getTypeKind(type: GraphQLNamedType): SchemaTypeKindFilter | null {
  if (isObjectType(type)) return 'OBJECT'
  if (isInputObjectType(type)) return 'INPUT_OBJECT'
  if (isEnumType(type)) return 'ENUM'
  if (isUnionType(type)) return 'UNION'
  if (isInterfaceType(type)) return 'INTERFACE'
  if (isScalarType(type)) return 'SCALAR'
  return null
}

export function handleListSchemaTypes(
  schema: GraphQLSchema,
  kind?: SchemaTypeKindFilter,
): ListSchemaTypesResponse {
  const typeMap = schema.getTypeMap()
  const types: SchemaTypeSummary[] = []

  for (const [name, type] of Object.entries(typeMap)) {
    // Skip internal GraphQL types (those starting with __)
    if (name.startsWith('__')) {
      continue
    }

    const typeKind = getTypeKind(type)
    if (!typeKind) {
      continue
    }

    // Filter by kind if specified
    if (kind && typeKind !== kind) {
      continue
    }

    types.push({
      name: type.name,
      kind: typeKind,
      description: type.description || null,
    })
  }

  // Sort alphabetically by name
  types.sort((a, b) => a.name.localeCompare(b.name))

  return { types }
}
