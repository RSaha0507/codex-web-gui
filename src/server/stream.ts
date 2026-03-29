import { randomUUID } from 'node:crypto'
import { STREAM_CONNECTION_LIMIT, STREAM_KEEPALIVE_MS } from '#/lib/constants'
import type { StreamEventEnvelope } from '#/lib/types'

type Listener = {
  controller: ReadableStreamDefaultController<Uint8Array>
  keepAlive: ReturnType<typeof setInterval>
  closed: boolean
}

const encoder = new TextEncoder()
const listeners = new Map<string, Map<string, Listener>>()

function getConnectionCount(): number {
  let total = 0
  for (const sessionListeners of listeners.values()) {
    total += sessionListeners.size
  }
  return total
}

function removeListener(sessionId: string, listenerId: string): void {
  const sessionListeners = listeners.get(sessionId)
  const listener = sessionListeners?.get(listenerId)

  if (!sessionListeners || !listener) {
    return
  }

  clearInterval(listener.keepAlive)
  listener.closed = true
  sessionListeners.delete(listenerId)

  if (sessionListeners.size === 0) {
    listeners.delete(sessionId)
  }
}

function sendChunk(sessionId: string, listenerId: string, chunk: string): void {
  const sessionListeners = listeners.get(sessionId)
  const listener = sessionListeners?.get(listenerId)

  if (!listener || listener.closed) {
    return
  }

  try {
    listener.controller.enqueue(encoder.encode(chunk))
  } catch {
    try {
      listener.controller.close()
    } catch {
      // Ignore close errors after disconnects.
    }
    removeListener(sessionId, listenerId)
  }
}

export function emitSessionEvent(
  sessionId: string,
  event: StreamEventEnvelope,
): void {
  const chunk = `data: ${JSON.stringify(event)}\n\n`
  const sessionListeners = listeners.get(sessionId)

  if (!sessionListeners) {
    return
  }

  for (const listenerId of sessionListeners.keys()) {
    sendChunk(sessionId, listenerId, chunk)
  }
}

export function createSessionStreamResponse(
  sessionId: string,
  signal: AbortSignal,
): Response {
  if (getConnectionCount() >= STREAM_CONNECTION_LIMIT) {
    return new Response(
      JSON.stringify({
        message: 'Too many concurrent stream connections.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const listenerId = randomUUID()
      const keepAlive = setInterval(() => {
        sendChunk(sessionId, listenerId, ': keepalive\n\n')
      }, STREAM_KEEPALIVE_MS)

      const listener: Listener = {
        controller,
        keepAlive,
        closed: false,
      }

      const sessionListeners = listeners.get(sessionId) ?? new Map()
      sessionListeners.set(listenerId, listener)
      listeners.set(sessionId, sessionListeners)

      sendChunk(sessionId, listenerId, ': connected\n\n')

      signal.addEventListener(
        'abort',
        () => {
          try {
            listener.controller.close()
          } catch {
            // Ignore disconnection races.
          }
          removeListener(sessionId, listenerId)
        },
        {
          once: true,
        },
      )
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
