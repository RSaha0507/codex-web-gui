import { useState } from 'react'
import {
  Check,
  CheckCheck,
  Code,
  Columns,
  Edit3,
  FileCode,
  Layers,
  Save,
  X,
} from 'lucide-react'
import type { FileChangeRecord, ParsedDiffHunk } from '#/lib/types'
import { parseUnifiedDiff } from '#/lib/diffUtils'
import { applyAcceptedHunks, saveDirectFileEdit } from '#/server/functions'

type DiffViewerProps = {
  sessionId?: string
  fileChanges: FileChangeRecord[]
  onFileSaved?: () => void
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(timestamp)
}

function getChangeClasses(changeType: FileChangeRecord['changeType']): string {
  switch (changeType) {
    case 'created':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    case 'modified':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    case 'deleted':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200'
  }
}

export default function DiffViewer({
  sessionId,
  fileChanges,
  onFileSaved,
}: DiffViewerProps) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [acceptedHunks, setAcceptedHunks] = useState<Record<string, Set<string>>>({})
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editBuffer, setEditBuffer] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  if (fileChanges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-black/20 p-8 text-center text-sm text-slate-400">
        <FileCode className="mb-3 h-8 w-8 text-slate-500 opacity-60" />
        <p className="font-medium text-slate-300">No file diffs recorded yet</p>
        <p className="mt-1 text-xs text-slate-500">
          File changes will appear here in real-time as Codex inspects or modifies your code.
        </p>
      </div>
    )
  }

  // Find active file change (guaranteed at least 1 file)
  const activeChange: FileChangeRecord =
    fileChanges.find((c) => c.id === selectedFileId) ?? fileChanges[0]

  // Parse diff for active change into structured hunks
  const parsedFileDiffs = activeChange.diff
    ? parseUnifiedDiff(activeChange.diff)
    : []
  const activeParsedFile: ParsedFileDiff | undefined = parsedFileDiffs[0]
  const hunks = activeParsedFile ? activeParsedFile.hunks : []

  // Initialize accepted hunks state for this file if not set
  const currentAcceptedSet: Set<string> =
    acceptedHunks[activeChange.id] ?? new Set(hunks.map((h) => h.id))

  function toggleHunk(hunkId: string): void {
    const nextSet = new Set(currentAcceptedSet)
    if (nextSet.has(hunkId)) {
      nextSet.delete(hunkId)
    } else {
      nextSet.add(hunkId)
    }
    setAcceptedHunks((prev) => ({
      ...prev,
      [activeChange.id]: nextSet,
    }))
  }

  function toggleAllHunks(acceptAll: boolean): void {
    const nextSet = acceptAll ? new Set(hunks.map((h) => h.id)) : new Set<string>()
    setAcceptedHunks((prev) => ({
      ...prev,
      [activeChange.id]: nextSet,
    }))
  }

  async function handleApplySelectedHunks(): Promise<void> {
    if (!sessionId || !activeChange.diff) return
    setBusy(true)
    setStatusMessage(null)
    try {
      await applyAcceptedHunks({
        data: {
          sessionId,
          filePath: activeChange.filePath,
          acceptedHunkIds: Array.from(currentAcceptedSet),
          diffText: activeChange.diff,
        },
      })
      setStatusMessage('Selected hunks applied to workspace!')
      if (onFileSaved) onFileSaved()
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Failed to apply hunks.',
      )
    } finally {
      setBusy(false)
    }
  }

  function startDirectEdit(): void {
    setEditingFileId(activeChange.id)
    setEditBuffer(activeChange.snapshotAfter ?? activeChange.snapshotBefore ?? '')
    setStatusMessage(null)
  }

  async function handleSaveDirectEdit(): Promise<void> {
    if (!sessionId) return
    setBusy(true)
    setStatusMessage(null)
    try {
      await saveDirectFileEdit({
        data: {
          sessionId,
          filePath: activeChange.filePath,
          content: editBuffer,
        },
      })
      setStatusMessage('File updated and saved successfully!')
      setEditingFileId(null)
      if (onFileSaved) onFileSaved()
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Failed to save direct edit.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* File Navigation Tabs / Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {fileChanges.map((change) => {
          const isSelected = change.id === activeChange.id
          return (
            <button
              key={change.id}
              type="button"
              onClick={() => {
                setSelectedFileId(change.id)
                setEditingFileId(null)
                setStatusMessage(null)
              }}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isSelected
                  ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100 shadow-sm'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              <span className="truncate max-w-[150px]">{change.filePath}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] ${getChangeClasses(
                  change.changeType,
                )}`}
              >
                {change.changeType[0].toUpperCase()}
              </span>
            </button>
          )
        })}
      </div>

      <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 shadow-xl">
        {/* Workbench Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/4 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-100">
                {activeChange.filePath}
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getChangeClasses(
                  activeChange.changeType,
                )}`}
              >
                {activeChange.changeType}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatTime(activeChange.createdAt)} •{' '}
              {hunks.length} {hunks.length === 1 ? 'hunk' : 'hunks'}
            </p>
          </div>

          {/* Mode & Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Unified vs Side-by-Side Split Switcher */}
            <div className="flex items-center rounded-full border border-white/10 bg-black/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
                  viewMode === 'unified'
                    ? 'bg-cyan-400/20 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Unified Inline View"
              >
                <Layers className="h-3 w-3" />
                <span>Unified</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
                  viewMode === 'split'
                    ? 'bg-cyan-400/20 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Side-by-Side Split View"
              >
                <Columns className="h-3 w-3" />
                <span>Side-by-Side</span>
              </button>
            </div>

            {/* Direct Quick Edit Trigger */}
            {editingFileId !== activeChange.id ? (
              <button
                type="button"
                onClick={startDirectEdit}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Direct in-browser edit before applying"
              >
                <Edit3 className="h-3 w-3 text-cyan-300" />
                <span>Quick Edit</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditingFileId(null)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-3 w-3" />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="border-b border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-200 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-cyan-300 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Direct In-Browser Editor View */}
        {editingFileId === activeChange.id ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-cyan-400" />
                Direct In-Browser Editor — edit lines freely before saving
              </span>
              <span className="text-[11px] text-slate-500">
                {editBuffer.split('\n').length} lines
              </span>
            </div>
            <textarea
              value={editBuffer}
              onChange={(e) => setEditBuffer(e.target.value)}
              rows={16}
              className="w-full rounded-2xl border border-white/10 bg-[#05080c] p-4 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/50"
              spellCheck={false}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFileId(null)}
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-slate-400 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveDirectEdit()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                <span>{busy ? 'Saving…' : 'Save & Apply to Disk'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Diff Viewer Content */
          <div className="p-3">
            {/* Granular Hunk-by-Hunk Acceptance Toolbar */}
            {hunks.length > 0 && sessionId && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/5 bg-white/3 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="font-medium text-slate-200">
                    Hunk Staging:
                  </span>
                  <span>
                    {currentAcceptedSet.size} of {hunks.length} hunks accepted
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAllHunks(true)}
                    className="text-[11px] text-cyan-300 hover:underline"
                  >
                    Accept All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => toggleAllHunks(false)}
                    className="text-[11px] text-slate-400 hover:underline"
                  >
                    Reject All
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApplySelectedHunks()}
                    disabled={busy || currentAcceptedSet.size === 0}
                    className="ml-2 flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-40"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>Apply Selected Hunks</span>
                  </button>
                </div>
              </div>
            )}

            {/* Render Hunks (Unified or Split) */}
            {hunks.length > 0 ? (
              <div className="space-y-4">
                {hunks.map((hunk) => {
                  const isAccepted = currentAcceptedSet.has(hunk.id)
                  return (
                    <div
                      key={hunk.id}
                      className={`overflow-hidden rounded-2xl border transition ${
                        isAccepted
                          ? 'border-white/10 bg-[#06090e]'
                          : 'border-white/5 bg-black/40 opacity-50'
                      }`}
                    >
                      {/* Hunk Header with Granular Accept/Reject Toggle */}
                      <div className="flex items-center justify-between border-b border-white/5 bg-white/3 px-3 py-1.5 text-xs">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-300/80">
                          <span>{hunk.header}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleHunk(hunk.id)}
                          className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                            isAccepted
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                              : 'border-slate-600 bg-slate-800/40 text-slate-400'
                          }`}
                        >
                          {isAccepted ? (
                            <>
                              <Check className="h-2.5 w-2.5" /> Accepted
                            </>
                          ) : (
                            <>
                              <X className="h-2.5 w-2.5" /> Skipped
                            </>
                          )}
                        </button>
                      </div>

                      {/* Diff Lines Rendering */}
                      {viewMode === 'unified' ? (
                        /* UNIFIED VIEW */
                        <div className="overflow-x-auto font-mono text-xs">
                          {hunk.lines.map((line, idx) => {
                            const isAdd = line.type === 'add'
                            const isDel = line.type === 'delete'
                            return (
                              <div
                                key={`${hunk.id}-line-${idx}`}
                                className={`flex py-0.5 px-2 ${
                                  isAdd
                                    ? 'bg-emerald-500/12 text-emerald-200'
                                    : isDel
                                      ? 'bg-rose-500/12 text-rose-200'
                                      : 'text-slate-300'
                                }`}
                              >
                                {/* Line Numbers Gutter */}
                                <span className="w-9 shrink-0 select-none text-right pr-2 text-[10px] text-slate-600">
                                  {line.oldLineNumber ?? ''}
                                </span>
                                <span className="w-9 shrink-0 select-none text-right pr-2 text-[10px] text-slate-600 border-r border-white/5 mr-2">
                                  {line.newLineNumber ?? ''}
                                </span>
                                {/* Marker */}
                                <span className="w-4 shrink-0 select-none text-center font-bold">
                                  {isAdd ? '+' : isDel ? '-' : ' '}
                                </span>
                                {/* Line Content */}
                                <span className="whitespace-pre flex-1">
                                  {line.text || ' '}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        /* SPLIT (SIDE-BY-SIDE) VIEW */
                        <div className="overflow-x-auto font-mono text-xs">
                          <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/5 bg-white/2 py-1 text-[10px] text-slate-500">
                            <div className="px-3">Original (Before)</div>
                            <div className="px-3">Proposed (After)</div>
                          </div>
                          {renderSplitHunkLines(hunk)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Fallback for raw diff without structured hunks */
              <pre className="max-h-[30rem] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-slate-300">
                {activeChange.diff || 'No diff text available for this file.'}
              </pre>
            )}
          </div>
        )}
      </article>
    </div>
  )
}

function renderSplitHunkLines(hunk: ParsedDiffHunk) {
  const rows: Array<{
    left?: { lineNum?: number; text: string; isDel: boolean }
    right?: { lineNum?: number; text: string; isAdd: boolean }
  }> = []

  let i = 0
  while (i < hunk.lines.length) {
    const line = hunk.lines[i]
    if (line.type === 'context') {
      rows.push({
        left: { lineNum: line.oldLineNumber, text: line.text, isDel: false },
        right: { lineNum: line.newLineNumber, text: line.text, isAdd: false },
      })
      i++
    } else if (line.type === 'delete') {
      const nextLine: DiffHunkLine | undefined = hunk.lines[i + 1]
      if (nextLine && nextLine.type === 'add') {
        rows.push({
          left: { lineNum: line.oldLineNumber, text: line.text, isDel: true },
          right: { lineNum: nextLine.newLineNumber, text: nextLine.text, isAdd: true },
        })
        i += 2
      } else {
        rows.push({
          left: { lineNum: line.oldLineNumber, text: line.text, isDel: true },
        })
        i++
      }
    } else if (line.type === 'add') {
      rows.push({
        right: { lineNum: line.newLineNumber, text: line.text, isAdd: true },
      })
      i++
    } else {
      i++
    }
  }

  return rows.map((row, idx) => (
    <div
      key={`split-row-${idx}`}
      className="grid grid-cols-2 divide-x divide-white/5 py-0.5 text-xs hover:bg-white/2"
    >
      {/* Left (Before) */}
      <div
        className={`flex px-2 ${
          row.left?.isDel ? 'bg-rose-500/15 text-rose-200' : 'text-slate-400'
        }`}
      >
        <span className="w-8 shrink-0 select-none text-right pr-2 text-[10px] text-slate-600">
          {row.left?.lineNum ?? ''}
        </span>
        <span className="w-3 shrink-0 select-none text-center font-bold">
          {row.left?.isDel ? '-' : ' '}
        </span>
        <span className="whitespace-pre overflow-hidden text-ellipsis flex-1">
          {row.left?.text ?? ''}
        </span>
      </div>

      {/* Right (After) */}
      <div
        className={`flex px-2 ${
          row.right?.isAdd ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-300'
        }`}
      >
        <span className="w-8 shrink-0 select-none text-right pr-2 text-[10px] text-slate-600">
          {row.right?.lineNum ?? ''}
        </span>
        <span className="w-3 shrink-0 select-none text-center font-bold">
          {row.right?.isAdd ? '+' : ' '}
        </span>
        <span className="whitespace-pre overflow-hidden text-ellipsis flex-1">
          {row.right?.text ?? ''}
        </span>
      </div>
    </div>
  ))
}
