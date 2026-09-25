import { Activity, FlaskConical } from 'lucide-react'
import type { SessionRecord, TokenMetrics } from '#/lib/types'
import TokenCostBadge from './TokenCostBadge'

type StatusBarProps = {
  session: SessionRecord
  connectionStatus: 'idle' | 'connecting' | 'live' | 'disconnected'
  fileChangeCount: number
  tokenMetrics?: TokenMetrics
  onOpenTestRunner?: () => void
}

function getConnectionLabel(status: StatusBarProps['connectionStatus']) {
  switch (status) {
    case 'idle':
      return 'Offline / Replay'
    case 'connecting':
      return 'Connecting'
    case 'live':
      return 'Live Stream'
    case 'disconnected':
      return 'Disconnected'
  }
}

export default function StatusBar({
  session,
  connectionStatus,
  fileChangeCount,
  tokenMetrics,
  onOpenTestRunner,
}: StatusBarProps) {
  const isLive = connectionStatus === 'live'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/40 px-4 py-2.5 text-xs text-slate-400">
      {/* Left session meta tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-200">
          <span
            className={`h-2 w-2 rounded-full ${
              isLive
                ? 'bg-emerald-400 animate-pulse'
                : connectionStatus === 'disconnected'
                  ? 'bg-rose-400'
                  : 'bg-slate-500'
            }`}
          />
          {getConnectionLabel(connectionStatus)}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-slate-300">
          {session.model}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
          Approval: {session.approvalMode}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
          {fileChangeCount} {fileChangeCount === 1 ? 'file edit' : 'file edits'}
        </span>

        {onOpenTestRunner && (
          <button
            type="button"
            onClick={onOpenTestRunner}
            className="flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-200 hover:bg-cyan-400/20"
          >
            <FlaskConical className="h-3 w-3" />
            <span>Test Runner</span>
          </button>
        )}
      </div>

      {/* Right Token & Cost Counter */}
      {tokenMetrics && (
        <div className="flex items-center gap-2">
          <TokenCostBadge metrics={tokenMetrics} />
        </div>
      )}
    </div>
  )
}
