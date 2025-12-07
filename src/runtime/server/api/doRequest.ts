import { defineEventHandler, readBody } from 'h3'
import { doGraphqlRequest } from '../utils/doGraphqlRequest'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

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
