import type { NuxtApp } from '#app'
import type { Subscription } from '#nuxt-graphql-middleware/operation-types'
import type { WebsocketMessage } from '../types'

export class GraphqlMiddlewareWebsocketHandler {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, number>()
  private connectionPromise: Promise<any> | null = null

  constructor(
    private url: string,
    private app: NuxtApp,
  ) {}

  public async init(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.ws = new WebSocket(this.url)

    this.ws.addEventListener('message', (event) => {
      const response: WebsocketMessage = JSON.parse(event.data)
      if (response.type === 'response') {
        this.app.hooks.callHook(
          'nuxt-graphql-middleware:subscription',
          response,
        )
      }
    })

    this.connectionPromise = new Promise((resolve) =>
      this.ws!.addEventListener('open', resolve),
    )
    return this.connectionPromise
  }

  public send(message: WebsocketMessage) {
    if (!this.ws) {
      throw new Error('WebSocket not connected.')
    }
    this.ws.send(JSON.stringify(message))
  }

  public async subscribe(
    name: keyof Subscription,
    key: string,
    variables?: Record<string, any>,
  ) {
    const existing = this.subscriptions.get(key)

    // There are already subscriptions, so increment the count.
    if (existing !== undefined) {
      this.subscriptions.set(key, existing + 1)
      return
    }

    this.send({
      type: 'subscribe',
      name,
      key,
      variables,
    })

    this.subscriptions.set(key, 1)
  }

  public async unsubscribe(key: string) {
    const existing = this.subscriptions.get(key)

    if (existing !== undefined && existing > 1) {
      this.subscriptions.set(key, existing - 1)
      return
    }

    this.send({
      type: 'unsubscribe',
      key,
    })

    this.subscriptions.delete(key)
  }
}
