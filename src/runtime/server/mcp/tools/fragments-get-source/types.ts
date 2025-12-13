import { z } from 'zod'

export const GetFragmentSourceResponseSchema = z.object({
  source: z
    .string()
    .nullable()
    .describe('The GraphQL source code of the fragment'),
  error: z.string().optional().describe('Error message if fragment not found'),
})

export const getFragmentSourceOutputSchema = {
  source: z
    .string()
    .optional()
    .describe('The GraphQL source code of the fragment'),
  error: z.string().optional().describe('Error message if fragment not found'),
}

export type GetFragmentSourceResponse = z.infer<
  typeof GetFragmentSourceResponseSchema
>
