import { createFileRoute } from '@tanstack/react-router'
import { isUuid } from '#/lib/types'
import { interruptSessionRuntime } from '#/server/pty'

export const Route = createFileRoute('/api/interrupt/$sessionId')({
  server: {
    handlers: {
      POST: ({ params }) => {
        if (!isUuid(params.sessionId)) {
          return Response.json({ message: 'Invalid session id.' }, { status: 400 })
        }

        try {
          interruptSessionRuntime(params.sessionId)
          return Response.json({ ok: true })
        } catch (error) {
          return Response.json(
            {
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to interrupt the session.',
            },
            { status: 400 },
          )
        }
      },
    },
  },
})
