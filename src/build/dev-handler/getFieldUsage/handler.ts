import {
  parse,
  visit,
  type GraphQLSchema,
  isObjectType,
  isInterfaceType,
  TypeInfo,
  visitWithTypeInfo,
} from 'graphql'
import type { Collector } from '../../Collector'
import type {
  GetFieldUsageResponse,
  FieldUsageLocation,
} from '../../../runtime/server/mcp/tools/operations-get-field-usage/types'

export function handleGetFieldUsage(
  collector: Collector,
  schema: GraphQLSchema,
  typeName: string,
  fieldName: string,
): GetFieldUsageResponse {
  // Verify the type exists in the schema
  const type = schema.getType(typeName)
  if (!type) {
    return {
      typeName,
      fieldName,
      usages: [],
      error: `Type "${typeName}" not found in schema`,
    }
  }

  // Verify the type has fields
  if (!isObjectType(type) && !isInterfaceType(type)) {
    return {
      typeName,
      fieldName,
      usages: [],
      error: `Type "${typeName}" is not an object or interface type`,
    }
  }

  // Verify the field exists on the type
  const fields = type.getFields()
  if (!fields[fieldName]) {
    return {
      typeName,
      fieldName,
      usages: [],
      error: `Field "${fieldName}" not found on type "${typeName}"`,
    }
  }

  const usages: FieldUsageLocation[] = []
  const operations = collector.getOperations()
  const fragments = collector.getFragments()

  // Check operations
  for (const operation of operations) {
    if (hasFieldUsage(schema, operation.source, typeName, fieldName)) {
      usages.push({
        kind: 'operation',
        name: operation.name,
        filePath: operation.relativeFilePath,
      })
    }
  }

  // Check fragments
  for (const fragment of fragments) {
    if (hasFieldUsage(schema, fragment.source, typeName, fieldName)) {
      usages.push({
        kind: 'fragment',
        name: fragment.name,
        filePath: fragment.relativeFilePath,
      })
    }
  }

  return {
    typeName,
    fieldName,
    usages,
  }
}

function hasFieldUsage(
  schema: GraphQLSchema,
  source: string,
  targetTypeName: string,
  targetFieldName: string,
): boolean {
  try {
    const document = parse(source)
    const typeInfo = new TypeInfo(schema)
    let found = false

    visit(
      document,
      visitWithTypeInfo(typeInfo, {
        Field: {
          enter(node) {
            if (found) return

            const parentType = typeInfo.getParentType()
            if (!parentType) return

            const parentTypeName = parentType.name
            const fieldName = node.name.value

            // Direct match on the type
            if (
              parentTypeName === targetTypeName &&
              fieldName === targetFieldName
            ) {
              found = true
              return
            }

            // Check if the parent type implements the target interface
            if (isObjectType(parentType)) {
              const interfaces = parentType.getInterfaces()
              for (const iface of interfaces) {
                if (
                  iface.name === targetTypeName &&
                  fieldName === targetFieldName
                ) {
                  // Verify the field actually exists on the interface
                  const ifaceFields = iface.getFields()
                  if (ifaceFields[targetFieldName]) {
                    found = true
                    return
                  }
                }
              }
            }

            // Also check if target type implements an interface that the parent type has
            const targetType = schema.getType(targetTypeName)
            if (targetType && isObjectType(targetType)) {
              const targetInterfaces = targetType.getInterfaces()
              for (const iface of targetInterfaces) {
                if (
                  parentTypeName === iface.name &&
                  fieldName === targetFieldName
                ) {
                  found = true
                  return
                }
              }
            }
          },
        },
      }),
    )

    return found
  } catch {
    return false
  }
}
