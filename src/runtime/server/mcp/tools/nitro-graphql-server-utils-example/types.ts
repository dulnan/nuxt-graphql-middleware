import { z } from 'zod'

/**
 * Schema for a single usage example.
 */
export const ServerUtilExampleSchema = z.object({
  code: z
    .string()
    .describe('The code example showing how to use the server util'),
  description: z
    .string()
    .describe('A description of what this example demonstrates'),
  documentationUrl: z
    .string()
    .describe('URL to the documentation for this server util'),
})

/**
 * Schema for an import entry.
 */
export const ImportEntrySchema = z.object({
  typeName: z.string().describe('The name of the type to import'),
  description: z
    .string()
    .describe(
      'What this type is used for (e.g., "Variables type", "Response type", "Input type", "Enum type")',
    ),
})

/**
 * Response schema for the handler.
 */
export const GetServerUtilExamplesResponseSchema = z.object({
  examples: z.array(ServerUtilExampleSchema).optional(),
  imports: z.array(ImportEntrySchema).optional(),
  error: z.string().optional(),
})

/**
 * MCP output schema.
 */
export const serverUtilExamplesOutputSchema = {
  examples: z
    .array(ServerUtilExampleSchema)
    .optional()
    .describe('Array of usage examples for the operation'),
  imports: z
    .array(ImportEntrySchema)
    .optional()
    .describe(
      'Array of types that can be imported from #graphql-operations for this operation',
    ),
  error: z
    .string()
    .optional()
    .describe('Error message if the operation was not found'),
}

export type ServerUtilExample = z.infer<typeof ServerUtilExampleSchema>
export type ImportEntry = z.infer<typeof ImportEntrySchema>
export type GetServerUtilExamplesResponse = z.infer<
  typeof GetServerUtilExamplesResponseSchema
>
