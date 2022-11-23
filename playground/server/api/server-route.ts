/**
 * Custom server route that performs a GraphQL query and returns the mapped
 * data.
 */
export default defineEventHandler(async () => {
  // Return value is fully typed.
  const { data } = await useGraphqlQuery('users')
  return data.users.map((v) => v.email)
})
