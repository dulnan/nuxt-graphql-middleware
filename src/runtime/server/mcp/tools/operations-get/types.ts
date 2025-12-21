import { z } from 'zod'
import { CollectorOperationSchema } from '../operations-list/types'

export const GetOperationResponseSchema = z.object({
  operation: CollectorOperationSchema.nullable(),
  error: z.string().optional().describe('Error message if operation not found'),
})

export const getOperationOutputSchema = {
  name: z.string().optional().describe('The GraphQL operation name'),
  type: z
    .enum(['query', 'mutation'])
    .optional()
    .describe('The type of operation (query or mutation)'),
  filePath: z
    .string()
    .optional()
    .describe('Path to the file containing the operation'),
  hasVariables: z
    .boolean()
    .optional()
    .describe('Whether the operation has any variables'),
  needsVariables: z
    .boolean()
    .optional()
    .describe(
      'Whether the operation requires variables (has non-null variables)',
    ),
  variablesTypeName: z
    .string()
    .optional()
    .describe('TypeScript type name for the operation variables'),
  responseTypeName: z
    .string()
    .optional()
    .describe('TypeScript type name for the operation response'),
  error: z.string().optional().describe('Error message if operation not found'),
}

export type GetOperationResponse = z.infer<typeof GetOperationResponseSchema>
