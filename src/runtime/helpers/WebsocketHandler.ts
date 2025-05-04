import type { NuxtApp } from '#app'
import type { Subscription } from '#nuxt-graphql-middleware/operation-types'
import type { WebsocketMessage } from '../types'

export class GraphqlMiddlewareWebsocketHandler {
  private ws: WebSocket | null = null
  private subscriptions = new Set<string>()
  private connectionPromise: Promise<void | any> | null = null

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
    if (this.subscriptions.has(key)) {
      return
    }

    this.send({
      type: 'subscribe',
      name,
      key,
      variables,
    })
  }

  public async unsubscribe(key: string) {
    this.send({
      type: 'unsubscribe',
      key,
    })
  }
}
