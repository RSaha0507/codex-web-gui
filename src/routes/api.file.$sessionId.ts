import { createFileRoute } from '@tanstack/react-router'
import { isUuid } from '#/lib/types'
import { buildFileTree, readFilePreview } from '#/server/files'
import { getSessionById } from '#/server/sessions'

export const Route = createFileRoute('/api/file/$sessionId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!isUuid(params.sessionId)) {
          return Response.json({ message: 'Invalid session id.' }, { status: 400 })
        }

        const session = getSessionById(params.sessionId)
        if (!session) {
          return Response.json({ message: 'Session not found.' }, { status: 404 })
        }

        const url = new URL(request.url)
        const relativePath = url.searchParams.get('path')

        if (relativePath) {
          try {
            const preview = await readFilePreview(session.cwd, relativePath)
            return Response.json({
              path: relativePath,
              content: preview.content,
              truncated: preview.truncated,
            })
          } catch (error) {
            return Response.json(
              {
                message:
                  error instanceof Error ? error.message : 'Failed to read file.',
              },
              { status: 400 },
            )
          }
        }

        return Response.json({
          cwd: session.cwd,
          nodes: await buildFileTree(session.cwd),
        })
      },
    },
  },
})
