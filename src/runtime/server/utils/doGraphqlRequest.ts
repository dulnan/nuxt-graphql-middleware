import type { H3Event } from 'h3'
import { serverOptions } from '#nuxt-graphql-middleware/server-options'
import { useRuntimeConfig } from '#imports'
import { useEvent } from 'nitropack/runtime'
import type { GraphqlMiddlewareRequestContext } from '../../types'
import {
  getEndpoint,
  getFetchOptions,
  withSignal,
  getClientAbortSignal,
  onServerError,
  onServerResponse,
} from '../helpers'
import { GraphqlMiddlewareOperation } from '../../settings'

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
  return sendGraphqlRequest(providedEvent ?? useEvent(), body, context)
}

/**
 * Send the request to the GraphQL server.
 *
 * For file uploads, the form data is sent instead of the JSON body.
 */
export async function sendGraphqlRequest(
  event: H3Event,
  body: RequestBody,
  context: GraphqlMiddlewareRequestContext | null,
  formData?: FormData,
) {
  if (serverOptions.doGraphqlRequest) {
    return serverOptions.doGraphqlRequest({
      event,
      operation: body.operation,
      operationName: body.operationName,
      operationDocument: body.query,
      variables: body.variables || {},
      formData,
      context: context || {},
    })
  }

  const operation = body.operation || null
  const operationName = body.operationName || null

  // Get the runtime config.
  const runtimeConfig = useRuntimeConfig().graphqlMiddleware

  // Determine the endpoint of the GraphQL server.
  const endpoint = await getEndpoint(
    runtimeConfig,
    serverOptions,
    event,
    operation,
    operationName,
    context || null,
  )

  // Get the fetch options for this request.
  const { fetchOptions, done } = withSignal(
    await getFetchOptions(
      serverOptions,
      event,
      operation,
      operationName,
      context,
    ),
    runtimeConfig.graphqlServerTimeout,
    // Queries are aborted when the client closes the connection. Mutations
    // are left to finish: Some GraphQL servers stop halfway if the connection
    // is closed.
    operation === GraphqlMiddlewareOperation.Query
      ? getClientAbortSignal(event)
      : undefined,
  )

  return $fetch
    .raw(endpoint, {
      // @ts-expect-error Not yet been fixed in nitro.
      method: 'POST',
      body: formData ?? {
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
        operation,
        operationName,
        context,
      )
    })
    .catch((error) => {
      return onServerError(
        serverOptions,
        event,
        error,
        operation,
        operationName,
        context,
      )
    })
    .finally(done)
}
