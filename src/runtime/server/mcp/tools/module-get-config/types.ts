import { z } from 'zod'

/**
 * Schema for module paths.
 */
export const ModulePathsSchema = z.object({
  runtimeTypes: z
    .string()
    .describe('Path to the runtime types file provided by the module'),
  schema: z.string().describe('Path to the GraphQL schema file'),
  serverOptions: z
    .string()
    .nullable()
    .describe(
      'Path to the graphqlMiddleware.serverOptions.ts file, or null if not found',
    ),
  clientOptions: z
    .string()
    .nullable()
    .describe(
      'Path to the graphqlMiddleware.clientOptions.ts file, or null if not found',
    ),
  documentTypes: z
    .string()
    .describe(
      'Path to the generated TypeScript types file for all GraphQL operations and fragments',
    ),
})

/**
 * Response schema for the module config handler.
 */
export const GetModuleConfigResponseSchema = z.object({
  autoImportPatterns: z
    .array(z.string())
    .describe(
      'The resolved file patterns used to discover GraphQL documents (queries, mutations, fragments)',
    ),
  paths: ModulePathsSchema.describe('Important file paths used by the module'),
})

/**
 * MCP output schema.
 */
export const moduleConfigOutputSchema = {
  autoImportPatterns: z
    .array(z.string())
    .describe(
      'The resolved file patterns used to discover GraphQL documents (queries, mutations, fragments)',
    ),
  paths: ModulePathsSchema.describe('Important file paths used by the module'),
}

export type ModulePaths = z.infer<typeof ModulePathsSchema>
export type GetModuleConfigResponse = z.infer<
  typeof GetModuleConfigResponseSchema
>
