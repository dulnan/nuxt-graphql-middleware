import { defineStaticTemplate } from './../defineTemplate'

/**
 * Nuxt types template.
 */
export default defineStaticTemplate(
  { path: 'nuxt-graphql-middleware/nuxt' },
  () => {
    return `
export {}
`
  },
  (helper) => {
    return `
import type { OperationResponseError, WebsocketMessageSubscriptionResponse } from '${helper.paths.runtimeTypes}'
import type { HookResult } from 'nuxt/schema'

declare module '#app' {
  interface RuntimeNuxtHooks {
    /**
     * Emitted when any GraphQL response contains errors.
     */
    'nuxt-graphql-middleware:errors': (
      errors: OperationResponseError,
    ) => HookResult

    /**
     * Emitted when receiving a subscription response.
     */
    'nuxt-graphql-middleware:subscription-response': (data: WebsocketMessageSubscriptionResponse) => HookResult
  }
}
`
  },
)
