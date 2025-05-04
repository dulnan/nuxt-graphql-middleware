import { defineWebSocketHandler } from 'h3'
import { createClient, type Client } from 'graphql-ws'
import type { Peer } from 'crossws'
import WebSocket from 'ws'
import type { WebsocketMessage } from '../../types'
import type { Subscription } from '#nuxt-graphql-middleware/operation-types'
import { documents } from '#nuxt-graphql-middleware/documents'
import { serverOptions } from '#nuxt-graphql-middleware/server-options'
import type { GraphqlClientContext } from '#nuxt-graphql-middleware/client-options'

if (!serverOptions.websocket?.getEndpoint) {
  throw new Error(
    'Missing "websocket.graphqlWebsocketEndpoint" method in graphqlMiddleware.serverOptions.ts. This method is required when the subscriptions feature is enabled.',
  )
}

type SubscriptionName = keyof Subscription

function sendPeerMessage(peer: Peer, message: WebsocketMessage) {
  peer.send(message)
}

function getErrorReason(e: unknown): string {
  if (
    typeof e === 'object' &&
    e &&
    'reason' in e &&
    typeof e.reason === 'string'
  ) {
    return e.reason
  } else if (e instanceof Error) {
    return e.message
  } else if (typeof e === 'string') {
    return e
  }

  return 'Unknown Error'
}

class SubscriptionHandler {
  private subscriptions = new Map<string, () => void>()

  constructor(private client: Client) {}

  public static create(
    url: string,
    connectionParams: Record<string, any>,
  ): Promise<SubscriptionHandler> {
    return new Promise((resolve, reject) => {
      try {
        const client = createClient({
          url,
          webSocketImpl: WebSocket,
          connectionParams,
          lazy: false,
          onNonLazyError: (e) => {
            reject(e)
          },
          on: {
            connected: () => {
              const handler = new SubscriptionHandler(client)
              resolve(handler)
            },
            error: (e) => {
              reject(e)
            },
            closed: (e) => {
              reject(e)
            },
            message: (e) => {
              console.log('on message')
              console.log(e)
            },
          },
        })
      } catch (e) {
        console.log('init error')
        reject(e)
      }
    })
  }

  /**
   * Subscribe for the given subscription.
   */
  public subscribe(
    peer: Peer,
    name: SubscriptionName,
    key: string,
    clientContext: GraphqlClientContext,
    variables?: Record<string, any>,
  ) {
    if (this.subscriptions.has(key)) {
      return
    }

    const query = documents.subscription[name]
    if (!name) {
      throw new Error(`Invalid subscription name "${name}".`)
    }

    const extensions = serverOptions.websocket?.operationExtensions
      ? serverOptions.websocket.operationExtensions(clientContext)
      : undefined

    const unsubscribe = this.client.subscribe(
      {
        query,
        variables,
        extensions,
      },
      {
        next: (value) => {
          sendPeerMessage(peer, {
            type: 'server:response',
            name,
            key,
            response: value as any,
          })
        },
        error: () => {
          // console.log(error)
        },
        complete: () => {
          console.log('Complete')
        },
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
  // open(peer) {},

  async message(peer, wsMessage) {
    const message: WebsocketMessage = wsMessage.json()
    if (message.type === 'client:init') {
      try {
        if (!peer.context.graphql) {
          const url = serverOptions.websocket!.getEndpoint(peer)
          const connectionParams = serverOptions.websocket?.connectionParams
            ? serverOptions.websocket.connectionParams(
                peer.request,
                message.clientContext,
              )
            : {}

          peer.context.graphql = await SubscriptionHandler.create(
            url,
            connectionParams,
          )
        }

        sendPeerMessage(peer, {
          type: 'server:init',
        })
      } catch (e) {
        const reason = getErrorReason(e)

        sendPeerMessage(peer, {
          type: 'server:error',
          errorType: 'closed-on-init',
          reason,
        })
      }
    } else if (peer.context.graphql instanceof SubscriptionHandler) {
      if (message.type === 'client:subscribe') {
        peer.context.graphql.subscribe(
          peer,
          message.name,
          message.key,
          message.clientContext as GraphqlClientContext,
          message.variables,
        )
      } else if (message.type === 'client:unsubscribe') {
        peer.context.graphql.unsubscribe(message.key)
      }
    }
  },

  close(peer) {
    if (peer.context.graphql instanceof SubscriptionHandler) {
      peer.context.graphql.destroy()
      peer.context.graphql = undefined
    }
  },

  error(peer) {
    console.log('[ws] error', peer.id)
  },
})
