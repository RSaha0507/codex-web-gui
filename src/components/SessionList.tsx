import { Link } from '@tanstack/react-router'
import type { SessionRecord } from '#/lib/types'

type SessionListProps = {
  sessions: SessionRecord[]
  activeSessionId?: string
}

function formatRelativeTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

function getStatusClass(status: SessionRecord['status']): string {
  switch (status) {
    case 'active':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'ended':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-300'
    case 'error':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  }
}

export default function SessionList({
  sessions,
  activeSessionId,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
        No sessions yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <Link
          key={session.id}
          to="/session/$sessionId"
          params={{ sessionId: session.id }}
          className={`block rounded-3xl border px-4 py-3 no-underline transition ${
            session.id === activeSessionId
              ? 'border-cyan-400/40 bg-cyan-400/10'
              : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/6'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">
                {session.title}
              </p>
              <p className="mt-1 truncate text-xs text-slate-400">{session.cwd}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${getStatusClass(
                session.status,
              )}`}
            >
              {session.status}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>{session.model}</span>
            <span>{formatRelativeTime(session.updatedAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
