import { useState } from 'react'
import {
  Check,
  ChevronDown,
  FolderGit2,
  FolderPlus,
  Folders,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { WorkspaceRecord } from '#/lib/types'
import { addWorkspaceAction, removeWorkspaceAction } from '#/server/functions'

type WorkspaceSwitcherProps = {
  currentCwd: string
  workspaces: WorkspaceRecord[]
  onSelectWorkspace: (cwd: string) => void
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function WorkspaceSwitcher({
  currentCwd,
  workspaces: initialWorkspaces,
  onSelectWorkspace,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>(initialWorkspaces)
  const [newPathInput, setNewPathInput] = useState('')
  const [newNameInput, setNewNameInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current workspace name
  const currentWorkspace =
    workspaces.find((w) => w.path === currentCwd) || {
      name: currentCwd.split('/').pop() || currentCwd,
      path: currentCwd,
    }

  async function handleAddWorkspace(): Promise<void> {
    const path = newPathInput.trim()
    if (!path) return
    setError(null)
    try {
      const res = await addWorkspaceAction({
        data: {
          path,
          name: newNameInput.trim() || undefined,
        },
      })
      setWorkspaces((prev) => [res.workspace, ...prev.filter((w) => w.path !== res.workspace.path)])
      setIsAdding(false)
      setNewPathInput('')
      setNewNameInput('')
      onSelectWorkspace(res.workspace.path)
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid directory path.')
    }
  }

  async function handleRemoveWorkspace(id: string, e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    await removeWorkspaceAction({ data: { id } })
    setWorkspaces((prev) => prev.filter((w) => w.id !== id))
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 hover:border-white/20"
      >
        <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
        <span className="font-semibold text-slate-100 max-w-[140px] truncate">
          {currentWorkspace.name}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:p-6">
          <div className="w-full max-w-xl rounded-[2.4rem] border border-white/10 bg-[#090d12] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <Folders className="h-5 w-5 text-cyan-300" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/70">
                    Workspace Switcher
                  </p>
                  <h3 className="text-lg font-semibold text-slate-100">
                    Recent Repositories & Folders
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Add New Workspace Bar */}
              {!isAdding ? (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/2 py-3 text-xs font-medium text-cyan-300 transition hover:bg-white/5 hover:border-cyan-400/40"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>Add / Switch to Another Working Directory</span>
                </button>
              ) : (
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">
                    Add Repository Directory
                  </h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Absolute or relative folder path (e.g. /home/user/my-project)"
                      value={newPathInput}
                      onChange={(e) => setNewPathInput(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
                    />
                    <input
                      type="text"
                      placeholder="Display Name (optional)"
                      value={newNameInput}
                      onChange={(e) => setNewNameInput(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400/40"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-rose-300">{error}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddWorkspace}
                      className="rounded-full border border-cyan-400/40 bg-cyan-400/20 px-4 py-1 text-xs font-medium text-cyan-100 hover:bg-cyan-400/30"
                    >
                      Open Workspace
                    </button>
                  </div>
                </div>
              )}

              {/* Workspaces List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Bookmarked Workspaces ({workspaces.length})
                </p>
                {workspaces.map((ws) => {
                  const isActive = ws.path === currentCwd
                  return (
                    <div
                      key={ws.id}
                      onClick={() => {
                        onSelectWorkspace(ws.path)
                        setIsOpen(false)
                      }}
                      className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition ${
                        isActive
                          ? 'border-cyan-400/40 bg-cyan-400/10'
                          : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/4'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-100 truncate">
                            {ws.name}
                          </span>
                          {isActive && (
                            <span className="flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/20 px-2 py-0.2 text-[9px] font-semibold text-cyan-200">
                              <Check className="h-2.5 w-2.5" /> Active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400 truncate">
                          {ws.path}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {ws.sessionCount} sessions • Opened{' '}
                          {formatRelativeTime(ws.lastOpenedAt)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleRemoveWorkspace(ws.id, e)}
                        className="rounded-full border border-white/5 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Remove bookmark"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
