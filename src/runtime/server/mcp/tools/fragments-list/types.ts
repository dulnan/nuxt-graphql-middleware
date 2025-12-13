import { z } from 'zod'
import { FragmentInfoSchema } from '../fragments-list-for-type/types'

export const ListFragmentsResponseSchema = z.object({
  fragments: z.array(FragmentInfoSchema),
})

// MCP output schema - only exposes filePath (mapped from relativeFilePath)
const FragmentSummaryMcpSchema = z.object({
  name: z.string().describe('Fragment name'),
  typeName: z.string().describe('The GraphQL type this fragment is defined on'),
  filePath: z
    .string()
    .describe('Path to the file relative to the project root'),
})

export const listFragmentsOutputSchema = {
  count: z.number().describe('Total number of fragments'),
  fragments: z
    .array(FragmentSummaryMcpSchema)
    .describe('List of all fragments'),
}

export type ListFragmentsResponse = z.infer<typeof ListFragmentsResponseSchema>
