import type { H3Event } from 'h3'

/**
 * The signals of the events whose connection is watched, so that every event
 * only gets one listener.
 */
const connectionSignals = new WeakMap<H3Event, AbortSignal>()

/**
 * Get a signal that is aborted when the client closes the connection of the
 * event before the response was sent.
 *
 * Returns nothing if the response might be cached and sent to other clients,
 * for example with the cache or swr route rules.
 *
 * The request emits "close" once its body was read, so the response is used.
 */
export function getConnectionAbortSignal(
  event: H3Event | null | undefined,
): AbortSignal | undefined {
  if (!event || event.context?.cache) {
    return
  }

  const existing = connectionSignals.get(event)
  if (existing) {
    return existing
  }

  const res = event.node?.res
  if (!res || typeof res.once !== 'function') {
    return
  }

  const controller = new AbortController()
  res.once('close', () => {
    if (!res.writableEnded) {
      controller.abort(
        new DOMException('The client closed the connection.', 'AbortError'),
      )
    }
  })
  connectionSignals.set(event, controller.signal)
  return controller.signal
}

/**
 * Whether the client closed the connection of the event before the response
 * was sent. Only known for events that have a signal.
 */
export function isConnectionAborted(event: H3Event): boolean {
  return !event.context?.cache && !!connectionSignals.get(event)?.aborted
}
