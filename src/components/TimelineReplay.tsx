import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCode,
  GitBranch,
  History,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import type { CheckpointRecord } from '#/lib/types'
import { rollbackToCheckpointAction } from '#/server/functions'

type TimelineReplayProps = {
  sessionId: string
  checkpoints: CheckpointRecord[]
  onRollbackComplete?: () => void
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(timestamp)
}

export default function TimelineReplay({
  sessionId,
  checkpoints,
  onRollbackComplete,
}: TimelineReplayProps) {
  const [selectedCheckpoint, setSelectedCheckpoint] =
    useState<CheckpointRecord | null>(null)
  const [confirmingRollback, setConfirmingRollback] =
    useState<CheckpointRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  async function executeRollback(checkpoint: CheckpointRecord): Promise<void> {
    setBusy(true)
    setStatusMessage(null)
    try {
      const result = await rollbackToCheckpointAction({
        data: {
          sessionId,
          checkpointTimestamp: checkpoint.createdAt,
        },
      })
      setStatusMessage(
        `Rollback successful! Reverted ${result.revertedFilesCount} file(s) to checkpoint.`,
      )
      setConfirmingRollback(null)
      if (onRollbackComplete) onRollbackComplete()
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Failed to rollback.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (checkpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-black/20 p-6 text-center text-xs text-slate-500">
        <History className="mb-2 h-6 w-6 text-slate-600" />
        <p>No timeline checkpoints recorded yet for this session.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {statusMessage && (
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-200 flex items-center justify-between">
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

      {/* Visual Git-like Timeline List */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
        {checkpoints.map((cp, idx) => {
          const isLatest = idx === 0
          const isRolledBack = cp.status === 'rolled_back'

          return (
            <div key={cp.id} className="relative group">
              {/* Timeline node icon */}
              <div
                className={`absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                  isRolledBack
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                    : isLatest
                      ? 'border-cyan-400 bg-cyan-500/30 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'border-white/20 bg-black text-slate-400'
                }`}
              >
                {isRolledBack ? (
                  <RotateCcw className="h-2.5 w-2.5" />
                ) : (
                  <GitBranch className="h-2.5 w-2.5" />
                )}
              </div>

              {/* Checkpoint Card */}
              <div
                className={`rounded-2xl border p-3.5 transition ${
                  isRolledBack
                    ? 'border-rose-500/20 bg-rose-500/5 opacity-60'
                    : isLatest
                      ? 'border-cyan-400/30 bg-cyan-400/5 shadow-md'
                      : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Step #{checkpoints.length - idx}
                      </span>
                      {isLatest && !isRolledBack && (
                        <span className="rounded-full border border-cyan-400/40 bg-cyan-400/20 px-2 py-0.2 text-[9px] font-semibold text-cyan-200 uppercase">
                          Current
                        </span>
                      )}
                      {isRolledBack && (
                        <span className="rounded-full border border-rose-500/40 bg-rose-500/20 px-2 py-0.2 text-[9px] font-semibold text-rose-300 uppercase">
                          Rolled Back
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-100 line-clamp-2">
                      {cp.promptText || 'Workspace initialization'}
                    </p>
                  </div>

                  {/* Rollback Trigger Button */}
                  {!isLatest && !isRolledBack && (
                    <button
                      type="button"
                      onClick={() => setConfirmingRollback(cp)}
                      className="shrink-0 flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-medium text-amber-200 transition hover:bg-amber-400/20"
                      title="Revert workspace files back to this checkpoint"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Revert</span>
                    </button>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(cp.createdAt)}
                  </span>
                  {cp.affectedFiles.length > 0 && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <FileCode className="h-3 w-3 text-cyan-400" />
                      {cp.affectedFiles.length}{' '}
                      {cp.affectedFiles.length === 1 ? 'file' : 'files'} modified
                    </span>
                  )}
                </div>

                {/* Affected files tags */}
                {cp.affectedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cp.affectedFiles.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-slate-400 truncate max-w-[150px]"
                      >
                        {f}
                      </span>
                    ))}
                    {cp.affectedFiles.length > 3 && (
                      <span className="text-[9px] text-slate-500">
                        +{cp.affectedFiles.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirmation Modal for Rollback */}
      {confirmingRollback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-amber-500/30 bg-[#0c1017] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-300">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold text-slate-100">
                Confirm Checkpoint Rollback
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Rolling back will revert all file modifications made after this step (
              <span className="font-semibold text-white">
                {confirmingRollback.promptText.slice(0, 50)}...
              </span>
              ) using SQLite snapshot records.
            </p>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs font-mono text-slate-400">
              Checkpoint Time: {formatTime(confirmingRollback.createdAt)}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingRollback(null)}
                disabled={busy}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-400 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeRollback(confirmingRollback)}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/20 px-4 py-2 text-xs font-medium text-amber-100 transition hover:bg-amber-400/30 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{busy ? 'Reverting Files…' : 'Confirm Rollback'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
