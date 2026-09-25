import { useEffect, useState } from 'react'
import {
  FileCode,
  Folder,
  FolderOpen,
  Pin,
  Search,
  X,
} from 'lucide-react'
import type { FileTreeNode, PinnedContextFile } from '#/lib/types'

type FileTreeProps = {
  sessionId: string
  refreshNonce: number
  modifiedPaths: Set<string>
  onPinFile?: (file: PinnedContextFile) => void
  pinnedPaths?: Set<string>
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
  onPinFile,
  pinnedPaths = new Set(),
}: FileTreeProps) {
  const [nodes, setNodes] = useState<FileTreeNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [filterQuery, setFilterQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadTree(): Promise<void> {
      try {
        const response = await fetch(`/api/file/${sessionId}`)
        const json = (await response.json()) as {
          nodes: FileTreeNode[]
          message?: string
        }

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
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load the file tree.',
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

  function handlePin(node: FileTreeNode, e: React.MouseEvent): void {
    e.stopPropagation()
    if (!onPinFile) return
    onPinFile({
      path: node.path,
      name: node.name,
    })
  }

  function renderNode(node: FileTreeNode, depth = 0): React.ReactNode {
    const isDirectory = node.type === 'directory'
    const isExpanded = expanded.has(node.path)
    const isModified = modifiedPaths.has(node.path)
    const isPinned = pinnedPaths.has(node.path)

    // Filter by query if search entered
    if (
      filterQuery &&
      !node.name.toLowerCase().includes(filterQuery.toLowerCase()) &&
      !node.path.toLowerCase().includes(filterQuery.toLowerCase())
    ) {
      if (!isDirectory) return null
    }

    return (
      <div key={node.path}>
        <div
          onClick={() =>
            isDirectory ? toggleFolder(node.path) : void openFile(node.path)
          }
          className={`group flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs cursor-pointer transition ${
            isModified
              ? 'text-cyan-200 bg-cyan-400/5 hover:bg-cyan-400/10'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {isDirectory ? (
              isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-cyan-400/80 shrink-0" />
              )
            ) : (
              <FileCode className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
            )}
            <span className="truncate font-mono">{node.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isModified && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                title="Modified in this session"
              />
            )}
            {!isDirectory && onPinFile && (
              <button
                type="button"
                onClick={(e) => handlePin(node, e)}
                className={`rounded p-1 transition ${
                  isPinned
                    ? 'text-cyan-300 bg-cyan-400/20'
                    : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-cyan-200 hover:bg-white/10'
                }`}
                title={isPinned ? 'Pinned to Context' : 'Pin file to prompt context'}
              >
                <Pin className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {isDirectory && isExpanded && node.children && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Search / Filter Filter */}
      <div className="mb-2 px-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-500" />
          <input
            type="text"
            placeholder="Filter files..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-7 pr-3 py-1 text-[11px] text-slate-200 outline-none focus:border-cyan-400/40"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-0.5">{nodes.map((node) => renderNode(node))}</div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#090d12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="font-mono text-sm font-semibold text-slate-100">
                  {preview.path}
                </p>
                {preview.truncated ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Preview truncated to keep modal responsive.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {onPinFile && (
                  <button
                    type="button"
                    onClick={() => {
                      onPinFile({
                        path: preview.path,
                        name: preview.path.split('/').pop() || preview.path,
                      })
                      setPreview(null)
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20"
                  >
                    <Pin className="h-3 w-3" />
                    <span>Pin to Prompt</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
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
