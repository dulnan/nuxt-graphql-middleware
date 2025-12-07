import {
  isObjectType,
  isInputObjectType,
  isEnumType,
  isUnionType,
  isInterfaceType,
  isScalarType,
  isNonNullType,
  isListType,
  type GraphQLSchema,
  type GraphQLType,
  type GraphQLField,
  type GraphQLInputField,
  type GraphQLEnumValue,
} from 'graphql'
import type {
  SchemaTypeField,
  SchemaTypeInfo,
  GetSchemaTypeResponse,
} from './types'

function formatType(type: GraphQLType): string {
  return type.toString()
}

function isNonNull(type: GraphQLType): boolean {
  return isNonNullType(type)
}

function isList(type: GraphQLType): boolean {
  if (isNonNullType(type)) {
    return isListType(type.ofType)
  }
  return isListType(type)
}

function mapField(
  field: GraphQLField<unknown, unknown> | GraphQLInputField,
): SchemaTypeField {
  return {
    name: field.name,
    description: field.description || null,
    type: formatType(field.type),
    isNonNull: isNonNull(field.type),
    isList: isList(field.type),
    deprecationReason:
      'deprecationReason' in field ? field.deprecationReason || null : null,
  }
}

function mapEnumValue(value: GraphQLEnumValue): {
  name: string
  description: string | null
} {
  return {
    name: value.name,
    description: value.description || null,
  }
}

export function handleGetSchemaType(
  schema: GraphQLSchema,
  name: string,
): GetSchemaTypeResponse {
  const type = schema.getType(name)

  if (!type) {
    return { type: null, error: `Type "${name}" not found in schema` }
  }

  const info: SchemaTypeInfo = {
    name: type.name,
    kind: 'UNKNOWN',
    description: type.description || null,
    fields: null,
    enumValues: null,
    possibleTypes: null,
    interfaces: null,
  }

  if (isObjectType(type)) {
    info.kind = 'OBJECT'
    info.fields = Object.values(type.getFields()).map(mapField)
    info.interfaces = type.getInterfaces().map((i) => i.name)
  } else if (isInputObjectType(type)) {
    info.kind = 'INPUT_OBJECT'
    info.fields = Object.values(type.getFields()).map(mapField)
  } else if (isEnumType(type)) {
    info.kind = 'ENUM'
    info.enumValues = type.getValues().map(mapEnumValue)
  } else if (isUnionType(type)) {
    info.kind = 'UNION'
    info.possibleTypes = type.getTypes().map((t) => t.name)
  } else if (isInterfaceType(type)) {
    info.kind = 'INTERFACE'
    info.fields = Object.values(type.getFields()).map(mapField)
  } else if (isScalarType(type)) {
    info.kind = 'SCALAR'
  }

  return { type: info }
}
