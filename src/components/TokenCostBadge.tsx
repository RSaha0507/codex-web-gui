import { useState } from 'react'
import { BarChart3, Coins, Cpu, Gauge, Info, Maximize2, Zap } from 'lucide-react'
import type { TokenMetrics } from '#/lib/types'
import TokenTrackerModal from './TokenTrackerModal'

type TokenCostBadgeProps = {
  metrics: TokenMetrics
  sessionId?: string
}

export default function TokenCostBadge({
  metrics,
  sessionId,
}: TokenCostBadgeProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:border-cyan-400/30"
          title="Session Token & Cost Counter (Click to inspect)"
        >
          <Coins className="h-3 w-3 text-amber-300" />
          <span className="font-mono font-medium text-amber-200">
            ${metrics.estimatedCostUsd.toFixed(4)}
          </span>
          <span className="text-slate-500">|</span>
          <span className="font-mono text-[11px] text-slate-300">
            {(metrics.totalTokens / 1000).toFixed(1)}k tok
          </span>
          <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.2 text-[9px] font-mono text-cyan-300">
            {metrics.contextUsedPercent}%
          </span>
        </button>

        {/* Popover Breakdown Modal */}
        {showDetails && (
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-white/10 bg-[#0a0e14] p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                <Zap className="h-3.5 w-3.5" />
                Token & Cost Metrics
              </span>
              <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-200 font-mono">
                {metrics.model}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Prompt Tokens:</span>
                <span className="font-mono text-slate-200">
                  {metrics.promptTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Completion Output:</span>
                <span className="font-mono text-slate-200">
                  {metrics.completionTokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-1 font-semibold text-slate-200">
                <span>Total Tokens:</span>
                <span className="font-mono text-cyan-300">
                  {metrics.totalTokens.toLocaleString()}
                </span>
              </div>

              {/* Context Window Capacity Gauge */}
              <div className="border-t border-white/5 pt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Gauge className="h-3 w-3 text-emerald-400" />
                    Context Limit:
                  </span>
                  <span className="font-mono text-emerald-300">
                    {metrics.contextUsedPercent}% of {((metrics.contextLimit || 128000) / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.max(3, metrics.contextUsedPercent)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-1.5 font-bold text-amber-300">
                <span>Estimated Cost:</span>
                <span className="font-mono text-sm">
                  ${metrics.estimatedCostUsd.toFixed(5)} USD
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowDetails(false)
                setIsModalOpen(true)
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Open Detailed Token Tracker</span>
            </button>
          </div>
        )}
      </div>

      {/* Full Modal Inspector */}
      <TokenTrackerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        metrics={metrics}
        sessionId={sessionId}
      />
    </>
  )
}
