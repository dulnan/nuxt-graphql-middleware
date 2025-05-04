import {
  importMetaServer,
  importMetaDev,
} from '#nuxt-graphql-middleware/config'
import {
  computed,
  isRef,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComputedRef,
  useNuxtApp,
  watch,
} from '#imports'
import type { Subscription } from '#nuxt-graphql-middleware/operation-types'
import type { GraphqlResponse } from '#nuxt-graphql-middleware/response'
import { GraphqlMiddlewareWebsocketHandler } from '../helpers/WebsocketHandler'
import type { GraphqlClientContext } from '#nuxt-graphql-middleware/client-options'
import type { WebsocketMessageSubscriptionResponse } from '../types'
import { getEndpoint } from '#nuxt-graphql-middleware/helpers'
import { hash } from 'ohash'
import { sortQueryParams, encodeContext } from '../helpers/composables'
import { clientOptions } from '#nuxt-graphql-middleware/client-options'

function getWebsocketUrl(): string {
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
> = Q['needsVariables'] extends true
  ? [K, Q['variables'] | ComputedRef<Q['variables']>, GetSubscriptionOptions<R>]
  :
      | [
          K,
          Q['variables'] | null | ComputedRef<Q['variables'] | null>,
          GetSubscriptionOptions<R>,
        ]
      | [K, GetSubscriptionHandler<R>]

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
  const isMounted = ref(false)

  const name = args[0]
  const variablesArg = args[1]
  const options = args[2]

  const variables = computed<Record<string, any>>(() => {
    if (typeof variablesArg === 'function') {
      return {}
    }

    return (isRef(variablesArg) ? variablesArg.value : variablesArg) || {}
  })

  const handler =
    typeof variablesArg === 'function'
      ? variablesArg
      : typeof options === 'function'
        ? options
        : options?.handler

  const overrideClientContext =
    typeof options === 'object' ? options.clientContext : {}

  const globalClientContext = (
    clientOptions && clientOptions.buildClientContext
      ? clientOptions.buildClientContext('subscription')
      : {}
  ) as GraphqlClientContext

  const clientContext = Object.assign(
    {},
    globalClientContext,
    overrideClientContext,
  ) as GraphqlClientContext

  const params = computed(() => {
    return sortQueryParams(
      Object.assign({}, encodeContext(clientContext), variables.value),
    )
  })

  const subscriptionKey = computed(() => `${name}:${hash(params.value)}`)

  async function subscribe(key: string) {
    if (!isMounted.value) {
      return
    }

    // Create instance if it does not yet exist.
    if (!app.$graphqlWebsocket) {
      const url = getWebsocketUrl()

      app.$graphqlWebsocket = new GraphqlMiddlewareWebsocketHandler(url, app, {
        debug: importMetaDev,
      })
    }

    try {
      await app.$graphqlWebsocket.init(globalClientContext)
      app.$graphqlWebsocket.subscribe(name, key, variables.value, clientContext)
    } catch (error) {
      console.error('Failed to initialize GraphQL subscription:', error)
    }
  }

  function unsubscribe(key: string) {
    if (app.$graphqlWebsocket) {
      app.$graphqlWebsocket.unsubscribe(key)
    }
  }

  function onSubscriptionResponse(
    message: WebsocketMessageSubscriptionResponse,
  ) {
    if (message.key === subscriptionKey.value && handler) {
      handler(message.response)
    }
  }

  onMounted(async () => {
    isMounted.value = true
    await subscribe(subscriptionKey.value)

    // If no handler is provided we don't need to add an event listener.
    if (!handler) {
      return
    }

    app.hook(
      'nuxt-graphql-middleware:subscription-response',
      onSubscriptionResponse,
    )
  })

  onBeforeUnmount(() => {
    isMounted.value = false
    unsubscribe(subscriptionKey.value)
    app.hooks.removeHook(
      'nuxt-graphql-middleware:subscription-response',
      onSubscriptionResponse,
    )
  })

  watch(subscriptionKey, (newKey, oldKey) => {
    if (!isMounted.value) {
      return
    }

    unsubscribe(oldKey)
    subscribe(newKey)
  })
}

declare module '#app' {
  interface NuxtApp {
    /**
     * The GraphQL subscription WebSocket handler with automatic reconnection
     */
    $graphqlWebsocket?: GraphqlMiddlewareWebsocketHandler
  }
}
