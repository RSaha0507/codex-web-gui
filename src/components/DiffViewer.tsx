import { useState } from 'react'
import type { FileChangeRecord } from '#/lib/types'

type DiffViewerProps = {
  fileChanges: FileChangeRecord[]
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

function getLineClasses(line: string): string {
  if (line.startsWith('+') && !line.startsWith('+++')) {
    return 'bg-emerald-500/10 text-emerald-100'
  }

  if (line.startsWith('-') && !line.startsWith('---')) {
    return 'bg-rose-500/10 text-rose-100'
  }

  if (line.startsWith('@@')) {
    return 'bg-cyan-500/10 text-cyan-100'
  }

  return 'text-slate-300'
}

export default function DiffViewer({ fileChanges }: DiffViewerProps) {
  const [expanded, setExpanded] = useState<string | null>(
    fileChanges[0]?.id ?? null,
  )

  if (fileChanges.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 text-sm text-slate-400">
        File changes will appear here as Codex edits the workspace.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {fileChanges.map((change) => {
        const isOpen = expanded === change.id
        const diffLines = (change.diff ?? '').split('\n')

        return (
          <article
            key={change.id}
            className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20"
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : change.id)}
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {change.filePath}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTime(change.createdAt)}
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-[11px] font-medium ${getChangeClasses(
                  change.changeType,
                )}`}
              >
                {change.changeType}
              </span>
            </button>

            {isOpen ? (
              <div className="border-t border-white/10 px-4 py-4">
                {change.diff ? (
                  <pre className="max-h-[30rem] overflow-auto rounded-3xl border border-white/10 bg-black/40 p-4 font-mono text-xs">
                    {diffLines.map((line, index) => (
                      <div key={`${change.id}-${index}`} className={getLineClasses(line)}>
                        {line || ' '}
                      </div>
                    ))}
                  </pre>
                ) : (
                  <p className="rounded-3xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-slate-400">
                    No unified diff was available for this file event.
                  </p>
                )}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
