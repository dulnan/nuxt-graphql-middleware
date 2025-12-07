import { z } from 'zod'

export const SchemaTypeKindFilterSchema = z.enum([
  'OBJECT',
  'INPUT_OBJECT',
  'ENUM',
  'UNION',
  'INTERFACE',
  'SCALAR',
])

export const SchemaTypeSummarySchema = z.object({
  name: z.string().describe('Type name'),
  kind: SchemaTypeKindFilterSchema.describe('The kind of GraphQL type'),
  description: z.string().nullable().describe('Type description'),
})

export const ListSchemaTypesResponseSchema = z.object({
  types: z.array(SchemaTypeSummarySchema),
})

export const listSchemaTypesOutputSchema = {
  count: z.number().describe('Total number of types'),
  types: z.array(SchemaTypeSummarySchema).describe('List of schema types'),
}

export type SchemaTypeKindFilter = z.infer<typeof SchemaTypeKindFilterSchema>
export type SchemaTypeSummary = z.infer<typeof SchemaTypeSummarySchema>
export type ListSchemaTypesResponse = z.infer<
  typeof ListSchemaTypesResponseSchema
>
