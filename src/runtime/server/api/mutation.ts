import { defineEventHandler, getQuery, getRouterParam, readBody } from 'h3'
import {
  extractRequestContext,
  isValidMutation,
  throwError,
} from './../helpers'
import { GraphqlMiddlewareOperation } from './../../settings'
import { documents } from '#nuxt-graphql-middleware/documents'
import { doGraphqlRequest } from '../utils/doGraphqlRequest'

export default defineEventHandler(async (event) => {
  const operationName = getRouterParam(event, 'name')
  if (!isValidMutation(operationName)) {
    return throwError('Invalid mutation name.')
  }

  const operationDocument = documents.mutation[operationName]
  const queryParams = getQuery(event)
  const context = extractRequestContext(queryParams)
  const variables = await readBody(event)

  return doGraphqlRequest(
    {
      query: operationDocument,
      variables,
      operation: GraphqlMiddlewareOperation.Mutation,
      operationName,
    },
    context,
    event,
  )
})
