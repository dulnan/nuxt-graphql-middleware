import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import {
  queryParamToVariables,
  extractRequestContext,
  isValidQuery,
  throwError,
} from './../helpers'
import { GraphqlMiddlewareOperation } from './../../settings'
import { documents } from '#nuxt-graphql-middleware/documents'
import { doGraphqlRequest } from '../utils/doGraphqlRequest'

export default defineEventHandler(async (event) => {
  const operationName = getRouterParam(event, 'name')

  if (!isValidQuery(operationName)) {
    return throwError('Invalid query name.')
  }

  const operationDocument = documents.query[operationName]
  const queryParams = getQuery(event)
  const context = extractRequestContext(queryParams)
  const variables = queryParamToVariables(queryParams)

  return doGraphqlRequest(
    {
      query: operationDocument,
      variables,
      operation: GraphqlMiddlewareOperation.Query,
      operationName,
    },
    context,
    event,
  )
})
