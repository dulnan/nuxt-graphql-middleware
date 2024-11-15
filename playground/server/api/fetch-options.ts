import { useGraphqlQuery } from '#imports'
import { defineEventHandler } from 'h3'

/**
 * Custom server route that performs a GraphQL query and returns the mapped
 * data.
 */
export default defineEventHandler(async () => {
  // Return value is fully typed.
  const data = await useGraphqlQuery('fetchOptions')
  return data.data
})
