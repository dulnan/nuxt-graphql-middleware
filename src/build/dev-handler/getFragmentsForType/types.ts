import { z } from 'zod'

// Internal schema with both absolute and relative paths
export const FragmentInfoSchema = z.object({
  name: z.string().describe('Fragment name'),
  typeName: z.string().describe('The GraphQL type this fragment is defined on'),
  filePath: z
    .string()
    .describe('Absolute path to the file containing the fragment'),
  relativeFilePath: z
    .string()
    .describe('Path to the file relative to the project root'),
  source: z.string().describe('The GraphQL source code of the fragment'),
  dependencies: z
    .array(z.string())
    .describe('Names of other fragments this fragment depends on'),
})

export const GetFragmentsForTypeResponseSchema = z.object({
  fragments: z.array(FragmentInfoSchema),
  error: z.string().optional().describe('Error message if type not found'),
})

// MCP output schema - only exposes filePath (mapped from relativeFilePath)
const FragmentMcpSchema = z.object({
  name: z.string().describe('Fragment name'),
  typeName: z.string().describe('The GraphQL type this fragment is defined on'),
  filePath: z
    .string()
    .describe('Path to the file relative to the project root'),
  source: z.string().describe('The GraphQL source code of the fragment'),
  dependencies: z
    .array(z.string())
    .describe('Names of other fragments this fragment depends on'),
})

export const getFragmentsForTypeOutputSchema = {
  fragments: z
    .array(FragmentMcpSchema)
    .describe('List of fragments for the specified type'),
  error: z.string().optional().describe('Error message if type not found'),
}

export type FragmentInfo = z.infer<typeof FragmentInfoSchema>
export type GetFragmentsForTypeResponse = z.infer<
  typeof GetFragmentsForTypeResponseSchema
>
