import { useGraphqlQuery } from '#imports'
import { defineEventHandler, getQuery } from 'h3'

/**
 * Custom server route that performs a GraphQL query and returns the mapped
 * data.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const language = query.language as string
  const data = await useGraphqlQuery({
    name: 'testClientOptions',
    variables: {
      path: '/' + language,
    },
    clientContext: {
      language,
    },
  })
  return data.data.testClientOptions?.language
})
