import { importMetaServer } from '#nuxt-graphql-middleware/config'
import { onMounted, onBeforeUnmount, useNuxtApp } from '#imports'
import type { Subscription } from '#nuxt-graphql-middleware/operation-types'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { GraphqlMiddlewareWebsocketHandler } from '../helpers/WebsocketHandler'
import type { GraphqlClientContext } from '#nuxt-graphql-middleware/client-options'
import type { WebsocketMessage } from '../types'
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'
import { hash } from 'ohash'
import { sortQueryParams, encodeContext } from '../helpers/composables'
import { clientOptions } from '#nuxt-graphql-middleware/client-options'

function getWebsocketUrl() {
  const isSecure = location.protocol === 'https:'
  const endpoint = getEndpoint('subscription')
  return (isSecure ? 'wss://' : 'ws://') + location.host + endpoint
}

type GetSubscriptionHandler<R> = (data: GraphqlResponse<R>) => void

type GetSubscriptionOptions<R> =
  | GetSubscriptionHandler<R>
  | {
      handler: GetSubscriptionHandler<R>
      clientContext?: Partial<GraphqlClientContext>
    }

type GetSubscriptionArgs<
  K extends keyof Subscription,
  Q extends Subscription[K] = Subscription[K],
  R extends Q['response'] = Q['response'],
> = Q['variables'] extends null
  ? [
      K,
      (null | undefined | GetSubscriptionOptions<R>)?,
      GetSubscriptionOptions<R>?,
    ]
  : Q['needsVariables'] extends true
    ? [K, Q['variables'], GetSubscriptionOptions<R>?]
    : [
        K,
        (Q['variables'] | null | GetSubscriptionOptions<R>)?,
        GetSubscriptionOptions<R>?,
      ]

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

  const name = args[0]
  const variablesArg = typeof args[1] === 'function' ? {} : args[1]
  const options = typeof args[1] === 'function' ? args[1] : args[2]

  const [handler, overrideClientContext] =
    typeof options === 'function'
      ? [options, undefined]
      : [options?.handler, options?.clientContext]

  const globalClientContext =
    clientOptions && clientOptions.buildClientContext
      ? clientOptions.buildClientContext()
      : {}

  const clientContext = Object.assign(
    {},
    globalClientContext,
    overrideClientContext,
  )

  const variables = variablesArg || {}

  const params = sortQueryParams(
    Object.assign({}, encodeContext(clientContext), variables),
  )

  // The unique key for the subscription + variables + client context.
  const key = `${name}:${hash(params)}`

  function onSubscriptionResponse(message: WebsocketMessage) {
    if (
      message.type === 'response' &&
      message.name === name &&
      message.key === key &&
      handler
    ) {
      handler(message.response)
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
