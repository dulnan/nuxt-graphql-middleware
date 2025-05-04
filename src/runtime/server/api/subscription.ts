import { defineWebSocketHandler } from 'h3'
import { createClient, type Client } from 'graphql-ws'
import type { Peer } from 'crossws'
import WebSocket from 'ws'
import type {
  WebsocketMessage,
  WebsocketMessageSubscriptionResponse,
} from '../../types'
import type { Subscription } from '#nuxt-graphql-middleware/operation-types'
import { documents } from '#nuxt-graphql-middleware/documents'
import { serverOptions } from '#nuxt-graphql-middleware/server-options'

if (!serverOptions.websocket?.getEndpoint) {
  throw new Error(
    'Missing "websocket.graphqlWebsocketEndpoint" method in graphqlMiddleware.serverOptions.ts. This method is required when the subscriptions feature is enabled.',
  )
}

type SubscriptionName = keyof Subscription

class SubscriptionHandler {
  private client: Client
  private subscriptions = new Map<string, () => void>()

  constructor(url: string) {
    this.client = createClient({
      url,
      webSocketImpl: WebSocket,
    })
  }

  /**
   * Subscribe for the given subscription.
   */
  public subscribe(
    peer: Peer,
    name: SubscriptionName,
    key: string,
    variables?: Record<string, any>,
  ) {
    if (this.subscriptions.has(key)) {
      return
    }

    const query = documents.subscription[name]
    if (!name) {
      throw new Error(`Invalid subscription name "${name}".`)
    }

    const unsubscribe = this.client.subscribe(
      {
        query,
        variables,
      },
      {
        next: (value) => {
          const message: WebsocketMessageSubscriptionResponse = {
            type: 'response',
            name,
            key,
            response: value as any,
          }
          peer.send(message)
        },
        error: (error) => {
          console.log(error)
        },
        complete: () => {},
      },
    )

    this.subscriptions.set(key, unsubscribe)
  }

  /**
   * Unsubscribe from the given subscription.
   */
  public unsubscribe(key: string) {
    const unsubscribe = this.subscriptions.get(key)
    if (unsubscribe) {
      unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  /**
   * Destroy the client.
   */
  public destroy(): void | Promise<void> {
    this.subscriptions.clear()
    return this.client.dispose()
  }
}

export default defineWebSocketHandler({
  open(peer) {
    if (!peer.context.graphql) {
      const url = serverOptions.websocket!.getEndpoint(peer)
      peer.context.graphql = new SubscriptionHandler(url)
    }
  },

  message(peer, wsMessage) {
    try {
      const message: WebsocketMessage = wsMessage.json()
      if (peer.context.graphql instanceof SubscriptionHandler) {
        if (message.type === 'subscribe') {
          peer.context.graphql.subscribe(
            peer,
            message.name,
            message.key,
            message.variables,
          )
        } else if (message.type === 'unsubscribe') {
          peer.context.graphql.unsubscribe(message.key)
        }
      }
    } catch (e) {
      console.error(e)
    }
  },

  close(peer, event) {
    if (peer.context.graphql instanceof SubscriptionHandler) {
      peer.context.graphql.destroy()
    }
  },

  error(peer, error) {
    console.log('[ws] error', peer.id)
  },
})
