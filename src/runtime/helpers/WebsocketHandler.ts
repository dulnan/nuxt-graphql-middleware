import type { NuxtApp } from '#app'
import type { GraphqlClientContext } from '#nuxt-graphql-middleware/client-options'
import type { Subscription } from '#nuxt-graphql-middleware/operation-types'
import type { WebsocketMessage } from '../types'

interface WebSocketOptions {
  reconnectAttempts?: number
  reconnectDelay?: number
  debug?: boolean
}

export class GraphqlMiddlewareWebsocketHandler {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, number>()
  private connectionPromise: Promise<void> | null = null
  private reconnectAttempts = 0
  private isDisposed = false
  private messageQueue: WebsocketMessage[] = []
  private readonly options: Required<WebSocketOptions>

  constructor(
    private url: string,
    private app: NuxtApp,
    options: WebSocketOptions = {},
  ) {
    this.options = {
      reconnectAttempts: options.reconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 1000,
      debug: options.debug ?? false,
    }
  }

  private log(...args: any[]) {
    if (this.options.debug) {
      console.log('[GraphQL WS]', ...args)
    }
  }

  public async init(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('WebSocket handler has been disposed')
    }

    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this.connect()
    return this.connectionPromise
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        const onOpen = () => {
          this.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.flushMessageQueue()
          this.ws?.removeEventListener('open', onOpen)
          this.ws?.removeEventListener('error', onError)
          resolve()
        }

        const onError = (error: Event) => {
          this.log('WebSocket connection error', error)
          this.ws?.removeEventListener('open', onOpen)
          this.ws?.removeEventListener('error', onError)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.addEventListener('open', onOpen)
        this.ws.addEventListener('error', onError)
        this.ws.addEventListener('message', this.handleMessage)
        this.ws.addEventListener('close', this.handleClose)
      } catch (error) {
        this.log('Error creating WebSocket:', error)
        reject(error)
      }
    })
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const response: WebsocketMessage = JSON.parse(event.data)
      if (response.type === 'response') {
        this.app.hooks.callHook(
          'nuxt-graphql-middleware:subscription',
          response,
        )
      }
    } catch (error) {
      this.log('Error parsing WebSocket message:', error)
    }
  }

  private handleClose = (event: CloseEvent) => {
    this.log('WebSocket closed', event.code, event.reason)
    this.connectionPromise = null

    if (
      !this.isDisposed &&
      this.reconnectAttempts < this.options.reconnectAttempts
    ) {
      this.reconnectAttempts++
      this.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.options.reconnectAttempts})`,
      )

      setTimeout(async () => {
        try {
          await this.connect()
          // @TODO: Re-subscribe - but how?
          this.flushMessageQueue()
        } catch (error) {
          this.log('Reconnection failed:', error)
        }
      }, this.options.reconnectDelay * this.reconnectAttempts)
    }
  }

  private flushMessageQueue() {
    while (
      this.messageQueue.length > 0 &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      const message = this.messageQueue.shift()!
      this.ws.send(JSON.stringify(message))
    }
  }

  public send(message: WebsocketMessage) {
    if (this.isDisposed) {
      throw new Error('WebSocket handler has been disposed')
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message)
      this.log('WebSocket not ready, queuing message', message)
      return
    }

    try {
      this.ws.send(JSON.stringify(message))
    } catch (error) {
      this.log('Error sending message:', error)
      this.messageQueue.push(message)
    }
  }

  public async subscribe(
    name: keyof Subscription,
    key: string,
    variables: Record<string, any> = {},
    clientContext: Partial<GraphqlClientContext> = {},
  ) {
    if (this.isDisposed) {
      throw new Error('WebSocket handler has been disposed')
    }

    const existing = this.subscriptions.get(key)

    // There are already subscriptions, so increment the count.
    if (existing !== undefined) {
      this.subscriptions.set(key, existing + 1)
      return
    }

    this.subscriptions.set(key, 1)

    this.send({
      type: 'subscribe',
      name,
      key,
      variables,
      clientContext,
    })
  }

  public async unsubscribe(key: string) {
    if (this.isDisposed) {
      return
    }

    const existing = this.subscriptions.get(key)

    if (existing !== undefined && existing > 1) {
      this.subscriptions.set(key, existing - 1)
      return
    }

    this.subscriptions.delete(key)

    this.send({
      type: 'unsubscribe',
      key,
    })
  }

  public dispose() {
    this.isDisposed = true

    if (this.ws) {
      this.ws.removeEventListener('message', this.handleMessage)
      this.ws.removeEventListener('close', this.handleClose)

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disposing')
      }

      this.ws = null
    }

    this.subscriptions.clear()
    this.messageQueue = []
    this.connectionPromise = null
  }
}
