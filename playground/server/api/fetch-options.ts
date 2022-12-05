import { useGraphqlQuery } from '#graphql-composable'

/**
 * Custom server route that performs a GraphQL query and returns the mapped
 * data.
 */
export default defineEventHandler(async () => {
  // Return value is fully typed.
  const { data } = await useGraphqlQuery('fetchOptions')
  return data
})
