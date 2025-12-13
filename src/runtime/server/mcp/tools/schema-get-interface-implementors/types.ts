import { z } from 'zod'

export const ImplementingTypeSchema = z.object({
  name: z.string().describe('Type name'),
  description: z.string().nullable().describe('Type description'),
})

export const GetTypesImplementingInterfaceResponseSchema = z.object({
  interfaceName: z.string().describe('The interface name'),
  types: z.array(ImplementingTypeSchema),
  error: z.string().optional().describe('Error message if interface not found'),
})

export const getTypesImplementingInterfaceOutputSchema = {
  interfaceName: z.string().optional().describe('The interface name'),
  count: z.number().optional().describe('Number of implementing types'),
  types: z
    .array(ImplementingTypeSchema)
    .optional()
    .describe('Types that implement the interface'),
  error: z.string().optional().describe('Error message if interface not found'),
}

export type ImplementingType = z.infer<typeof ImplementingTypeSchema>
export type GetTypesImplementingInterfaceResponse = z.infer<
  typeof GetTypesImplementingInterfaceResponseSchema
>
