import type { SessionRecord } from '#/lib/types'

type StatusBarProps = {
  session: SessionRecord
  connectionStatus: 'idle' | 'connecting' | 'live' | 'disconnected'
  fileChangeCount: number
}

function getConnectionLabel(status: StatusBarProps['connectionStatus']) {
  switch (status) {
    case 'idle':
      return 'Replay'
    case 'connecting':
      return 'Connecting'
    case 'live':
      return 'Live'
    case 'disconnected':
      return 'Disconnected'
  }
}

export default function StatusBar({
  session,
  connectionStatus,
  fileChangeCount,
}: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/30 px-4 py-3 text-xs text-slate-400">
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
        {session.model}
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
        {session.approvalMode}
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
        {getConnectionLabel(connectionStatus)}
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
        {fileChangeCount} changes
      </span>
      <span className="truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
        {session.cwd}
      </span>
    </div>
  )
}
