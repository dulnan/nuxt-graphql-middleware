import {
  isObjectType,
  isInputObjectType,
  isInterfaceType,
  isNonNullType,
  isListType,
  type GraphQLSchema,
  type GraphQLType,
} from 'graphql'
import type {
  TypeUsageLocation,
  GetTypeUsageResponse,
} from '../../../runtime/server/mcp/tools/schema-get-type-usage/types'

/**
 * Gets the named type from a potentially wrapped type (NonNull, List).
 */
function getNamedType(type: GraphQLType): string {
  if (isNonNullType(type) || isListType(type)) {
    return getNamedType(type.ofType)
  }
  return 'name' in type ? type.name : ''
}

export function handleGetTypeUsage(
  schema: GraphQLSchema,
  typeName: string,
): GetTypeUsageResponse {
  const targetType = schema.getType(typeName)

  if (!targetType) {
    return {
      typeName,
      usages: [],
      error: `Type "${typeName}" not found in schema`,
    }
  }

  const usages: TypeUsageLocation[] = []
  const typeMap = schema.getTypeMap()

  for (const [name, type] of Object.entries(typeMap)) {
    // Skip internal GraphQL types
    if (name.startsWith('__')) {
      continue
    }

    // Check object types and interface types for field return types and arguments
    if (isObjectType(type) || isInterfaceType(type)) {
      const fields = type.getFields()

      for (const [fieldName, field] of Object.entries(fields)) {
        // Check return type
        const returnTypeName = getNamedType(field.type)
        if (returnTypeName === typeName) {
          usages.push({
            typeName: name,
            fieldName,
            usageType: 'return_type',
          })
        }

        // Check arguments
        for (const arg of field.args) {
          const argTypeName = getNamedType(arg.type)
          if (argTypeName === typeName) {
            usages.push({
              typeName: name,
              fieldName: `${fieldName}(${arg.name})`,
              usageType: 'argument',
            })
          }
        }
      }
    }

    // Check input object types for field types
    if (isInputObjectType(type)) {
      const fields = type.getFields()

      for (const [fieldName, field] of Object.entries(fields)) {
        const fieldTypeName = getNamedType(field.type)
        if (fieldTypeName === typeName) {
          usages.push({
            typeName: name,
            fieldName,
            usageType: 'input_field',
          })
        }
      }
    }
  }

  // Sort by type name, then field name
  usages.sort((a, b) => {
    const typeCompare = a.typeName.localeCompare(b.typeName)
    if (typeCompare !== 0) return typeCompare
    return a.fieldName.localeCompare(b.fieldName)
  })

  return { typeName, usages }
}
