import { importMetaServer } from '#nuxt-graphql-middleware/config'
import { onMounted, onBeforeUnmount, useNuxtApp } from '#imports'
import type { Subscription } from '#nuxt-graphql-middleware/operation-types'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { GraphqlMiddlewareWebsocketHandler } from '../helpers/WebsocketHandler'
import type { WebsocketMessage } from '../types'
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'
import { hash } from 'ohash'
import { sortQueryParams } from '../helpers/composables'

function getWebsocketUrl() {
  const isSecure = location.protocol === 'https:'
  const endpoint = getEndpoint('subscription')
  return (isSecure ? 'wss://' : 'ws://') + location.host + endpoint
}

type GetSubscriptionOptions<R> = (data: GraphqlResponse<R>) => void

type GetSubscriptionArgs<
  K extends keyof Subscription,
  Q extends Subscription[K] = Subscription[K],
  R extends Q['response'] = Q['response'],
> = Q['variables'] extends null
  ? [K, (null | undefined)?, GetSubscriptionOptions<R>?]
  : Q['needsVariables'] extends true
    ? [K, Q['variables'], GetSubscriptionOptions<R>?]
    : [K, (Q['variables'] | null)?, GetSubscriptionOptions<R>?]

/**
 * Use a GraphQL subscription.
 */
export function useGraphqlSubscription<K extends keyof Subscription>(
  ...args: GetSubscriptionArgs<K>
): void {
  if (importMetaServer) {
    return
  }

  const app = useNuxtApp()

  const [name, variablesArg, cb] = args
  const variables = sortQueryParams(variablesArg || {})

  // The unique key for the subscription + variables. Makes sure that
  // we don't subscribe for the same thing multiple times.
  const key = hash(`${name}:${variables || {}}`)

  function onSubscriptionResponse(message: WebsocketMessage) {
    if (
      message.type === 'response' &&
      message.name === name &&
      message.key === key
    ) {
      if (cb) {
        cb(message.response)
      }
    }
  }

  onMounted(async () => {
    // Create instance if it does not yet exist.
    if (!app.$graphqlWebsocket) {
      app.$graphqlWebsocket = new GraphqlMiddlewareWebsocketHandler(
        getWebsocketUrl(),
        app,
      )
    }
    await app.$graphqlWebsocket.init()

    app.$graphqlWebsocket.subscribe(name, key, variables)
    app.hook('nuxt-graphql-middleware:subscription', onSubscriptionResponse)
  })

  onBeforeUnmount(() => {
    app.hooks.removeHook(
      'nuxt-graphql-middleware:subscription',
      onSubscriptionResponse,
    )
    if (app.$graphqlWebsocket) {
      app.$graphqlWebsocket.unsubscribe(key)
    }
  })
}

declare module '#app' {
  interface NuxtApp {
    /**
     * The GraphQL subscription WebSocket handler.
     */
    $graphqlWebsocket?: GraphqlMiddlewareWebsocketHandler
  }
}
