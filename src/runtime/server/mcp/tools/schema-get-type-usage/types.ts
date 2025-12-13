import { z } from 'zod'

export const TypeUsageLocationSchema = z.object({
  typeName: z.string().describe('The type where this type is used'),
  fieldName: z.string().describe('The field name'),
  usageType: z
    .enum(['return_type', 'argument', 'input_field'])
    .describe('How the type is used'),
})

export const GetTypeUsageResponseSchema = z.object({
  typeName: z.string().describe('The type being searched for'),
  usages: z.array(TypeUsageLocationSchema),
  error: z.string().optional().describe('Error message if type not found'),
})

export const getTypeUsageOutputSchema = {
  typeName: z.string().optional().describe('The type being searched for'),
  count: z.number().optional().describe('Number of usages found'),
  usages: z
    .array(TypeUsageLocationSchema)
    .optional()
    .describe('Locations where the type is used'),
  error: z.string().optional().describe('Error message if type not found'),
}

export type TypeUsageLocation = z.infer<typeof TypeUsageLocationSchema>
export type GetTypeUsageResponse = z.infer<typeof GetTypeUsageResponseSchema>
