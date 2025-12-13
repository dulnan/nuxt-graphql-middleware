import { z } from 'zod'

export const UnionMemberSchema = z.object({
  name: z.string().describe('Type name'),
  description: z.string().nullable().describe('Type description'),
})

export const GetUnionMembersResponseSchema = z.object({
  unionName: z.string().describe('The union name'),
  members: z.array(UnionMemberSchema),
  error: z.string().optional().describe('Error message if union not found'),
})

export const getUnionMembersOutputSchema = {
  unionName: z.string().optional().describe('The union name'),
  count: z.number().optional().describe('Number of union members'),
  members: z
    .array(UnionMemberSchema)
    .optional()
    .describe('Types that are part of the union'),
  error: z.string().optional().describe('Error message if union not found'),
}

export type UnionMember = z.infer<typeof UnionMemberSchema>
export type GetUnionMembersResponse = z.infer<
  typeof GetUnionMembersResponseSchema
>
