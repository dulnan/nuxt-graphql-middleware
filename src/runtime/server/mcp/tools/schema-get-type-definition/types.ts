import { z } from 'zod'

export const GetSchemaTypeDefinitionResponseSchema = z.object({
  definition: z
    .string()
    .nullable()
    .describe('The full SDL definition of the type'),
  error: z
    .string()
    .optional()
    .describe('Error message if the type was not found'),
})

export const getSchemaTypeDefinitionOutputSchema = {
  definition: z
    .string()
    .nullable()
    .describe('The full SDL definition of the type'),
  error: z
    .string()
    .optional()
    .describe('Error message if the type was not found'),
}

export type GetSchemaTypeDefinitionResponse = z.infer<
  typeof GetSchemaTypeDefinitionResponseSchema
>
