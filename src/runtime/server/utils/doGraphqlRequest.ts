import type { H3Event } from 'h3'
import { serverOptions } from '#nuxt-graphql-middleware/server-options'
import { useRuntimeConfig } from '#imports'
import { useEvent } from 'nitropack/runtime'
import type { GraphqlMiddlewareRequestContext } from '../../../types'
import {
  getEndpoint,
  getFetchOptions,
  onServerError,
  onServerResponse,
} from '../helpers'
import type { GraphqlMiddlewareOperation } from '../../settings'

type RequestBody = {
  query: string
  variables?: Record<string, any>
  operation?: GraphqlMiddlewareOperation
  operationName?: string
}

/**
 * Perform a raw GraphQL request.
 *
 * @param body - The request.
 * @param context - The client context.
 * @param event - The H3 event. If not provided, the util will try to get the event using useEvent().
 */
export async function doGraphqlRequest(
  body: RequestBody,
  context: GraphqlMiddlewareRequestContext | null | undefined = null,
  providedEvent: H3Event | null | undefined = null,
) {
  const operationName = body.operationName || null
  const event = providedEvent ?? useEvent()
  // Get the runtime config.
  const runtimeConfig = useRuntimeConfig().graphqlMiddleware

  if (serverOptions.doGraphqlRequest) {
    return serverOptions.doGraphqlRequest({
      event,
      operation: body.operation,
      operationName: body.operationName,
      operationDocument: body.query,
      variables: body.variables || {},
      context: context || {},
    })
  }

  // Determine the endpoint of the GraphQL server.
  const endpoint = await getEndpoint(
    runtimeConfig,
    serverOptions,
    event,
    null,
    operationName,
    context || null,
  )

  // Get the fetch options for this request.
  const fetchOptions = await getFetchOptions(
    serverOptions,
    event,
    null,
    body.operationName || null,
    context,
  )

  return $fetch
    .raw(endpoint, {
      // @ts-expect-error Not yet been fixed in nitro.
      method: 'POST',
      body: {
        query: body.query,
        variables: body.variables,
        operationName: body.operationName,
      },
      ...fetchOptions,
    })
    .then((response) => {
      return onServerResponse(
        serverOptions,
        event,
        response,
        null,
        operationName,
        context,
      )
    })
    .catch((error) => {
      return onServerError(
        serverOptions,
        event,
        error,
        null,
        operationName,
        context,
      )
    })
}
