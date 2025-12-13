import { z } from 'zod'

// Internal schema with both absolute and relative paths
export const CollectorOperationSchema = z.object({
  name: z.string().describe('The GraphQL operation name'),
  type: z
    .enum(['query', 'mutation'])
    .describe('The type of operation (query or mutation)'),
  filePath: z
    .string()
    .describe('Absolute path to the file containing the operation'),
  relativeFilePath: z
    .string()
    .describe('Path to the file relative to the project root'),
  hasVariables: z.boolean().describe('Whether the operation has any variables'),
  needsVariables: z
    .boolean()
    .describe(
      'Whether the operation requires variables (has non-null variables)',
    ),
  variablesTypeName: z
    .string()
    .describe('TypeScript type name for the operation variables'),
  responseTypeName: z
    .string()
    .describe('TypeScript type name for the operation response'),
  source: z.string().describe('The GraphQL source code of the operation'),
})

export const ListOperationsResponseSchema = z.object({
  operations: z.array(CollectorOperationSchema),
})

// MCP output schema - only exposes filePath (mapped from relativeFilePath)
const OperationMcpSchema = z.object({
  name: z.string().describe('The GraphQL operation name'),
  type: z
    .enum(['query', 'mutation'])
    .describe('The type of operation (query or mutation)'),
  filePath: z
    .string()
    .describe('Path to the file relative to the project root'),
  hasVariables: z.boolean().describe('Whether the operation has any variables'),
  needsVariables: z
    .boolean()
    .describe(
      'Whether the operation requires variables (has non-null variables)',
    ),
  variablesTypeName: z
    .string()
    .describe('TypeScript type name for the operation variables'),
  responseTypeName: z
    .string()
    .describe('TypeScript type name for the operation response'),
})

export const listOperationsOutputSchema = {
  count: z.number().describe('Total number of operations'),
  operations: z.array(OperationMcpSchema).describe('List of all operations'),
}

export type CollectorOperation = z.infer<typeof CollectorOperationSchema>
export type ListOperationsResponse = z.infer<
  typeof ListOperationsResponseSchema
>
