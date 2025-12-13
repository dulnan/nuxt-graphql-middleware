import { z } from 'zod'

export const SchemaTypeFieldSchema = z.object({
  name: z.string().describe('Field name'),
  description: z.string().nullable().describe('Field description'),
  type: z.string().describe('GraphQL type (e.g., "String!", "[User!]!")'),
  isNonNull: z.boolean().describe('Whether the field is non-nullable'),
  isList: z.boolean().describe('Whether the field is a list type'),
  deprecationReason: z
    .string()
    .nullable()
    .describe('Deprecation reason if the field is deprecated'),
})

export const SchemaTypeEnumValueSchema = z.object({
  name: z.string().describe('Enum value name'),
  description: z.string().nullable().describe('Enum value description'),
})

export const SchemaTypeKindSchema = z.enum([
  'OBJECT',
  'INPUT_OBJECT',
  'ENUM',
  'UNION',
  'INTERFACE',
  'SCALAR',
  'UNKNOWN',
])

export const SchemaTypeInfoSchema = z.object({
  name: z.string().describe('Type name'),
  kind: SchemaTypeKindSchema.describe('The kind of GraphQL type'),
  description: z.string().nullable().describe('Type description'),
  fields: z
    .array(SchemaTypeFieldSchema)
    .nullable()
    .describe('Fields for OBJECT, INPUT_OBJECT, and INTERFACE types'),
  enumValues: z
    .array(SchemaTypeEnumValueSchema)
    .nullable()
    .describe('Values for ENUM types'),
  possibleTypes: z
    .array(z.string())
    .nullable()
    .describe('Possible types for UNION types'),
  interfaces: z
    .array(z.string())
    .nullable()
    .describe('Implemented interfaces for OBJECT types'),
})

export const GetSchemaTypeResponseSchema = z.object({
  type: SchemaTypeInfoSchema.nullable(),
  error: z.string().optional().describe('Error message if type not found'),
})

export const getSchemaTypeOutputSchema = {
  name: z.string().optional().describe('Type name'),
  kind: SchemaTypeKindSchema.optional().describe('The kind of GraphQL type'),
  description: z.string().nullable().optional().describe('Type description'),
  fields: z
    .array(SchemaTypeFieldSchema)
    .nullable()
    .optional()
    .describe('Fields for OBJECT, INPUT_OBJECT, and INTERFACE types'),
  enumValues: z
    .array(SchemaTypeEnumValueSchema)
    .nullable()
    .optional()
    .describe('Values for ENUM types'),
  possibleTypes: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Possible types for UNION types'),
  interfaces: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Implemented interfaces for OBJECT types'),
  error: z.string().optional().describe('Error message if type not found'),
}

export type SchemaTypeField = z.infer<typeof SchemaTypeFieldSchema>
export type SchemaTypeEnumValue = z.infer<typeof SchemaTypeEnumValueSchema>
export type SchemaTypeKind = z.infer<typeof SchemaTypeKindSchema>
export type SchemaTypeInfo = z.infer<typeof SchemaTypeInfoSchema>
export type GetSchemaTypeResponse = z.infer<typeof GetSchemaTypeResponseSchema>
