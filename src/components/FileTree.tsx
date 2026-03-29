import { useEffect, useState } from 'react'
import type { FileTreeNode } from '#/lib/types'

type FileTreeProps = {
  sessionId: string
  refreshNonce: number
  modifiedPaths: Set<string>
}

type FilePreview = {
  path: string
  content: string
  truncated: boolean
}

export default function FileTree({
  sessionId,
  refreshNonce,
  modifiedPaths,
}: FileTreeProps) {
  const [nodes, setNodes] = useState<FileTreeNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<FilePreview | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadTree(): Promise<void> {
      try {
        const response = await fetch(`/api/file/${sessionId}`)
        const json = (await response.json()) as { nodes: FileTreeNode[]; message?: string }

        if (!response.ok) {
          throw new Error(json.message || 'Failed to load the file tree.')
        }

        if (!cancelled) {
          setNodes(json.nodes)
          setError(null)
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error ? nextError.message : 'Failed to load the file tree.',
          )
        }
      }
    }

    void loadTree()

    return () => {
      cancelled = true
    }
  }, [refreshNonce, sessionId])

  function toggleFolder(path: string): void {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  async function openFile(path: string): Promise<void> {
    try {
      const response = await fetch(
        `/api/file/${sessionId}?path=${encodeURIComponent(path)}`,
      )
      const json = (await response.json()) as FilePreview & { message?: string }
      if (!response.ok) {
        throw new Error(json.message || 'Failed to open the file.')
      }

      setPreview({
        path: json.path,
        content: json.content,
        truncated: json.truncated,
      })
      setError(null)
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to open the file.',
      )
    }
  }

  function renderNode(node: FileTreeNode, depth = 0): React.ReactNode {
    const isDirectory = node.type === 'directory'
    const isExpanded = expanded.has(node.path)

    return (
      <div key={node.path}>
        <button
          type="button"
          onClick={() =>
            isDirectory ? toggleFolder(node.path) : void openFile(node.path)
          }
          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/6"
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          <span className="w-4 text-center text-slate-500">
            {isDirectory ? (isExpanded ? '−' : '+') : '•'}
          </span>
          <span className="truncate">{node.name}</span>
          {modifiedPaths.has(node.path) ? (
            <span className="ml-auto h-2 w-2 rounded-full bg-cyan-300" />
          ) : null}
        </button>
        {isDirectory && isExpanded && node.children ? (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        ) : null}
      </div>
    )
  }

  return (
    <>
      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      <div className="space-y-1">{nodes.map((node) => renderNode(node))}</div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#090d12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">{preview.path}</p>
                {preview.truncated ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Preview truncated to keep the modal responsive.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <pre className="max-h-[70vh] overflow-auto bg-black/40 p-5 font-mono text-xs text-slate-200">
              {preview.content}
            </pre>
          </div>
        </div>
      ) : null}
    </>
  )
}
