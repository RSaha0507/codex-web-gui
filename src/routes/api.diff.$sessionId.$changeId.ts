import { createFileRoute } from '@tanstack/react-router'
import { isUuid } from '#/lib/types'
import { getFileChangeById, getSessionById } from '#/server/sessions'

export const Route = createFileRoute('/api/diff/$sessionId/$changeId')({
  server: {
    handlers: {
      GET: ({ params }) => {
        if (!isUuid(params.sessionId)) {
          return new Response('Invalid session id.', { status: 400 })
        }

        if (!getSessionById(params.sessionId)) {
          return new Response('Session not found.', { status: 404 })
        }

        const change = getFileChangeById(params.sessionId, params.changeId)
        if (!change) {
          return new Response('Diff not found.', { status: 404 })
        }

        return new Response(change.diff ?? '', {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        })
      },
    },
  },
})
