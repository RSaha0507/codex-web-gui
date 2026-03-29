import { createFileRoute } from '@tanstack/react-router'
import { isUuid } from '#/lib/types'
import { getSessionById } from '#/server/sessions'
import { createSessionStreamResponse } from '#/server/stream'

export const Route = createFileRoute('/api/stream/$sessionId')({
  server: {
    handlers: {
      GET: ({ params, request }) => {
        if (!isUuid(params.sessionId)) {
          return new Response('Invalid session id.', { status: 400 })
        }

        if (!getSessionById(params.sessionId)) {
          return new Response('Session not found.', { status: 404 })
        }

        return createSessionStreamResponse(params.sessionId, request.signal)
      },
    },
  },
})
