import type { H3Event } from 'h3'
import { getQuery, getRequestHeader, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { useEvent } from 'nitropack/runtime'
import type { GraphqlMiddlewareRequestContext } from '../../types'
import * as helpers from '../helpers'
import { createHandlers, type RequestBody } from '../handlers'

export const handlers = createHandlers<H3Event>({
  ...helpers,
  getQuery,
  getRouterParam,
  getRequestHeader,
  useRuntimeConfig,
  // @ts-expect-error Not yet been fixed in nitro.
  fetchRaw: (url, options) => $fetch.raw(url, options),
})

export const { sendGraphqlRequest } = handlers

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
