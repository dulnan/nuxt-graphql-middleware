import { MeansOfContact } from '#graphql-operations'
import { defineEventHandler } from 'h3'

/**
 * Custom server route that performs a GraphQL query and returns the mapped
 * data.
 */
export default defineEventHandler(async () => {
  return {
    keys: Object.keys(MeansOfContact),
    values: Object.keys(MeansOfContact),
  }
})
