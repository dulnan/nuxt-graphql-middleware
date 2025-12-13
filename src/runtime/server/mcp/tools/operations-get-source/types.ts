import { z } from 'zod'

export const GetOperationSourceResponseSchema = z.object({
  source: z
    .string()
    .nullable()
    .describe('The full GraphQL source code including fragments'),
  error: z.string().optional().describe('Error message if operation not found'),
})

export const getOperationSourceOutputSchema = {
  source: z
    .string()
    .optional()
    .describe('The full GraphQL source code including fragments'),
  error: z.string().optional().describe('Error message if operation not found'),
}

export type GetOperationSourceResponse = z.infer<
  typeof GetOperationSourceResponseSchema
>
