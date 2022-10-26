/**
 * Custom server route that performs a GraphQL query and returns the mapped
 * data.
 */
export default defineEventHandler(async () => {
  // Return value is fully typed.
  // const { data } = await $fetch('/api/graphql_middleware/query/allFilms')
  const { data } = await useGraphqlQuery('allFilms')
  return {
    filmTitles: data.allFilms.films.map((v) => v.title),
  }
})
