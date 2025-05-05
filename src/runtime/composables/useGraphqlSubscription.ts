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
  type Ref,
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

type GetSubscriptionCallback<R> = (data: GraphqlResponse<R>) => void

type GetSubscriptionOptions<R> = {
  /**
   * The callback that is executed whenever a subscription reponse in received.
   */
  callback: GetSubscriptionCallback<R>

  /**
   * Override global client context.
   *
   * Can also be a reactive property. If it changes, the composable will
   * unsubscribe and subscribe again with the updated values.
   */
  clientContext?:
    | Ref<Partial<GraphqlClientContext>>
    | Partial<GraphqlClientContext>
}

type GetSubscriptionCallbackOrOptions<R> =
  | GetSubscriptionCallback<R>
  | GetSubscriptionOptions<R>

// Subscriptions that have at least one required variable.
type SubscriptionWithVariables = {
  [K in keyof Subscription]: Subscription[K]['needsVariables'] extends true
    ? K
    : never
}[keyof Subscription]

// Subscriptions that either don't have variables or no required variables.
type SubscriptionWithoutVariables = {
  [K in keyof Subscription]: Subscription[K]['needsVariables'] extends false
    ? K
    : never
}[keyof Subscription]

/**
 * Use a GraphQL subscription with variables.
 *
 * @param name - The name of the subscription.
 * @param variables - The variables for the subscription operation.
 * @param callbackOrOptions - The callback or subscription options.
 */
export function useGraphqlSubscription<
  Name extends SubscriptionWithVariables,
  Variables extends
    Subscription[Name]['variables'] = Subscription[Name]['variables'],
  Response extends
    Subscription[Name]['response'] = Subscription[Name]['response'],
>(
  /**
   * The name of the subscription.
   */
  name: Name,

  /**
   * The operation variables.
   */
  variables: Variables | Ref<Variables>,

  /**
   * The callback to run when a subscription response is received or an object
   * containing a callback and/or client options.
   */
  callbackOrOptions: GetSubscriptionCallbackOrOptions<Response>,
): void

/**
 * Use a GraphQL subscription with optional variables.
 *
 * @param name - The name of the subscription.
 * @param variables - The variables for the subscription operation.
 * @param callbackOrOptions - The callback or subscription options.
 */
export function useGraphqlSubscription<
  Name extends SubscriptionWithoutVariables,
  Variables extends
    Subscription[Name]['variables'] = Subscription[Name]['variables'],
  Response extends
    Subscription[Name]['response'] = Subscription[Name]['response'],
>(
  /**
   * The name of the subscription.
   */
  name: Name,

  /**
   * The operation variables.
   */
  variables?: Variables | null | Ref<Variables | null>,

  /**
   * The callback to run when a subscription response is received or an object
   * containing a callback and/or client options.
   */
  callbackOrOptions?: GetSubscriptionCallbackOrOptions<Response>,
): void

/**
 * Use a GraphQL subscription without variables.
 *
 * @param name - The name of the subscription.
 * @param callback - The callback.
 */
export function useGraphqlSubscription<
  Name extends SubscriptionWithoutVariables,
  Response extends
    Subscription[Name]['response'] = Subscription[Name]['response'],
>(
  /**
   * The name of the subscription.
   */
  name: Name,

  /**
   * The callback to run when a subscription response is received.
   */
  callback: GetSubscriptionCallback<Response>,
): void

/**
 * Use a GraphQL subscription.
 */
export function useGraphqlSubscription<
  Name extends keyof Subscription,
  Variables extends
    Subscription[Name]['variables'] = Subscription[Name]['variables'],
  Response extends
    Subscription[Name]['response'] = Subscription[Name]['response'],
>(
  /**
   * The name of the subscription.
   */
  name: Name,

  /**
   * Either the variables or the callback.
   */
  variablesOrCallback?:
    | null
    | Variables
    | Ref<Variables | undefined | null>
    | GetSubscriptionCallback<Response>,

  /**
   * The options or callback.
   */
  optionsOrCallback?: GetSubscriptionCallbackOrOptions<Response>,
): void {
  if (importMetaServer) {
    return
  }

  const app = useNuxtApp()
  const isMounted = ref(false)

  // Extract the callback. For subscriptions without variables, one signature
  // allows providing the callback as the second argument. In all other cases,
  // the callback is either the third argument or part of the third argument
  // object.
  const callback =
    typeof variablesOrCallback === 'function'
      ? variablesOrCallback
      : typeof optionsOrCallback === 'function'
        ? optionsOrCallback
        : optionsOrCallback?.callback

  const globalClientContext =
    clientOptions && clientOptions.buildClientContext
      ? clientOptions.buildClientContext('subscription')
      : {}

  const variables = computed<Partial<Variables>>(() => {
    if (typeof variablesOrCallback === 'function') {
      return {}
    } else if (isRef(variablesOrCallback)) {
      return variablesOrCallback.value || {}
    }

    return variablesOrCallback || {}
  })

  // The overriden client context, that can also be reactive.
  const overrideClientContext = computed(() => {
    if (typeof optionsOrCallback === 'function') {
      return {}
    } else if (
      typeof optionsOrCallback === 'object' &&
      optionsOrCallback.clientContext
    ) {
      return isRef(optionsOrCallback.clientContext)
        ? optionsOrCallback.clientContext.value
        : optionsOrCallback.clientContext
    }

    return {}
  })

  const clientContext = computed(() =>
    Object.assign({}, globalClientContext, overrideClientContext.value),
  )

  const params = computed(() =>
    sortQueryParams(
      Object.assign({}, encodeContext(clientContext.value), variables.value),
    ),
  )

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
      app.$graphqlWebsocket.subscribe(
        name,
        key,
        variables.value,
        clientContext.value,
      )
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
    if (message.key === subscriptionKey.value && callback) {
      // @ts-expect-error The type is correct.
      callback(message.response)
    }
  }

  onMounted(async () => {
    isMounted.value = true
    await subscribe(subscriptionKey.value)

    // If no callback is provided we don't need to add an event listener.
    if (!callback) {
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
