import { z } from 'zod'
import { FragmentInfoSchema } from '../fragments-list-for-type/types'

export const GetFragmentResponseSchema = z.object({
  fragment: FragmentInfoSchema.nullable(),
  error: z.string().optional().describe('Error message if fragment not found'),
})

export const getFragmentOutputSchema = {
  name: z.string().optional().describe('Fragment name'),
  typeName: z
    .string()
    .optional()
    .describe('The GraphQL type this fragment is defined on'),
  filePath: z
    .string()
    .optional()
    .describe('Path to the file containing the fragment'),
  source: z
    .string()
    .optional()
    .describe('The GraphQL source code of the fragment'),
  dependencies: z
    .array(z.string())
    .optional()
    .describe('Names of other fragments this fragment depends on'),
  error: z.string().optional().describe('Error message if fragment not found'),
}

export type GetFragmentResponse = z.infer<typeof GetFragmentResponseSchema>
