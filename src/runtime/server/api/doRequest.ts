import { defineEventHandler } from 'h3'
import { doGraphqlRequest } from '../utils/doGraphqlRequest'
import { getBodySizeLimit, readJsonBody } from '../helpers'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const body = await readJsonBody(
    event,
    getBodySizeLimit(
      useRuntimeConfig().graphqlMiddleware.bodySizeLimit,
      'mutation',
    ),
  )

  const { document, variables, operationName } = body || {}

  if (!document || typeof document !== 'string') {
    return { data: null, errors: [{ message: 'Missing or invalid document' }] }
  }

  return doGraphqlRequest(
    {
      query: document,
      variables: variables || {},
      operationName: operationName || undefined,
    },
    null,
    event,
  )
})
