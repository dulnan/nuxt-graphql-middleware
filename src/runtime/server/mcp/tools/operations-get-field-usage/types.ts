import { z } from 'zod'

export const fieldUsageLocationSchema = z.object({
  kind: z
    .enum(['operation', 'fragment'])
    .describe('Whether this usage is in an operation or fragment'),
  name: z.string().describe('Name of the operation or fragment'),
  filePath: z.string().describe('File path where the usage occurs'),
})

export type FieldUsageLocation = z.infer<typeof fieldUsageLocationSchema>

export const getFieldUsageResponseSchema = z.object({
  typeName: z.string().describe('The GraphQL type name').optional(),
  fieldName: z.string().describe('The field name').optional(),
  usages: z
    .array(fieldUsageLocationSchema)
    .describe('All locations where this field is used'),
  error: z.string().optional().describe('Error message if the lookup failed'),
})

export const getFieldUsageOutputSchema = {
  typeName: z.string().optional().describe('The GraphQL type name'),
  fieldName: z.string().optional().describe('The field name'),
  count: z.number().optional().describe('Number of usages found'),
  usages: z
    .array(fieldUsageLocationSchema)
    .optional()
    .describe('All locations where this field is used'),
  error: z.string().optional().describe('Error message if the lookup failed'),
}

export type GetFieldUsageResponse = z.infer<typeof getFieldUsageResponseSchema>
