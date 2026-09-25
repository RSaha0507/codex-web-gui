import { useState } from 'react'
import { Coins, Cpu, Info, Zap } from 'lucide-react'
import type { TokenMetrics } from '#/lib/types'

type TokenCostBadgeProps = {
  metrics: TokenMetrics
}

export default function TokenCostBadge({ metrics }: TokenCostBadgeProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:border-white/20"
        title="Session Token & Cost Counter"
      >
        <Coins className="h-3 w-3 text-amber-300" />
        <span className="font-mono font-medium text-slate-200">
          ${metrics.estimatedCostUsd.toFixed(4)}
        </span>
        <span className="text-slate-500">|</span>
        <span className="font-mono text-[11px] text-slate-400">
          {(metrics.totalTokens / 1000).toFixed(1)}k tokens
        </span>
      </button>

      {/* Popover Breakdown Modal */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-white/10 bg-[#0a0e14] p-4 shadow-2xl space-y-3">
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

            <div className="flex items-center justify-between border-t border-white/5 pt-1.5 font-bold text-amber-300">
              <span>Estimated Cost:</span>
              <span className="font-mono text-sm">
                ${metrics.estimatedCostUsd.toFixed(5)} USD
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 text-[10px] text-slate-500 space-y-1">
            <p>
              Rates: ${(metrics.promptCostPer1k * 1000).toFixed(2)}/1M input • $
              {(metrics.completionCostPer1k * 1000).toFixed(2)}/1M output
            </p>
            <p className="italic">Calculated from prompt length and terminal stream volume.</p>
          </div>
        </div>
      )}
    </div>
  )
}
