/**
 * Custom server route that performs a GraphQL query and returns the mapped
 * data.
 */
export default defineEventHandler(async () => {
  // Return value is fully typed.
  const { allFilms } = await $fetch('/api/graphql_middleware/query/allFilms')
  return {
    filmTitles: allFilms.films.map((v) => v.title),
  }
})
