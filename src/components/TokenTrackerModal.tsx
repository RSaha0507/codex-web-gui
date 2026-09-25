import { useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  Coins,
  Cpu,
  Download,
  Gauge,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import type { TokenMetrics } from '#/lib/types'

type TokenTrackerModalProps = {
  isOpen: boolean
  onClose: () => void
  metrics: TokenMetrics
  sessionId?: string
}

export default function TokenTrackerModal({
  isOpen,
  onClose,
  metrics,
  sessionId,
}: TokenTrackerModalProps) {
  const [targetBudgetUsd, setTargetBudgetUsd] = useState<number>(1.0)
  const [activeTab, setActiveTab] = useState<'overview' | 'turns' | 'compare'>(
    'overview',
  )

  if (!isOpen) return null

  const budgetUsedPercent = Number(
    Math.min(100, (metrics.estimatedCostUsd / targetBudgetUsd) * 100).toFixed(1),
  )
  const isOverBudget = metrics.estimatedCostUsd >= targetBudgetUsd

  function handleExportTokenReport() {
    const report = {
      sessionId: sessionId ? sessionId : 'global',
      generatedAt: new Date().toISOString(),
      model: metrics.model,
      summary: {
        totalTokens: metrics.totalTokens,
        promptTokens: metrics.promptTokens,
        completionTokens: metrics.completionTokens,
        systemTokens: metrics.systemTokens,
        estimatedCostUsd: metrics.estimatedCostUsd,
        contextLimit: metrics.contextLimit,
        contextUsedPercent: metrics.contextUsedPercent,
      },
      turns: metrics.turns,
      modelComparisons: metrics.comparisons,
    }

    const jsonStr = JSON.stringify(report, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `codex-token-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-[2.4rem] border border-white/10 bg-[#090d12] shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <Coins className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-100">
                  Token Tracker & Budget Inspector
                </h3>
                <span className="rounded-full bg-cyan-400/15 border border-cyan-400/30 px-2 py-0.5 font-mono text-[10px] text-cyan-200">
                  {metrics.model}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time token utilization, cost estimation, and context capacity analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportTokenReport}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
              title="Export token usage receipt"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-white/2 px-6 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Usage Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('turns')}
            className={`ml-2 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === 'turns'
                ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Turn-by-Turn ({metrics.turns.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`ml-2 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === 'compare'
                ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Model Pricing Comparison</span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Primary Stat Cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Total Tokens Card */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-1">
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <Zap className="h-3.5 w-3.5 text-cyan-300" />
                    Total Tokens
                  </span>
                  <p className="font-mono text-2xl font-bold text-cyan-200">
                    {metrics.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Input + Output volume processed
                  </p>
                </div>

                {/* Estimated Cost Card */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-1">
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <Coins className="h-3.5 w-3.5 text-amber-300" />
                    Estimated Cost
                  </span>
                  <p className="font-mono text-2xl font-bold text-amber-300">
                    ${metrics.estimatedCostUsd.toFixed(5)}
                  </p>
                  <p className="text-[11px] text-slate-500">USD based on current model rates</p>
                </div>

                {/* Context Window Capacity Card */}
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-1">
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <Gauge className="h-3.5 w-3.5 text-emerald-300" />
                    Context Capacity
                  </span>
                  <p className="font-mono text-2xl font-bold text-emerald-300">
                    {metrics.contextUsedPercent}%
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Of {((metrics.contextLimit || 128000) / 1000).toFixed(0)}k token limit
                  </p>
                </div>
              </div>

              {/* Context Window Usage Gauge Progress Bar */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-cyan-400" />
                    Context Window Utilization
                  </span>
                  <span className="font-mono text-slate-400">
                    {metrics.totalTokens.toLocaleString()} / {(metrics.contextLimit || 128000).toLocaleString()} tokens ({metrics.contextUsedPercent}%)
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      metrics.contextUsedPercent > 80
                        ? 'bg-rose-500'
                        : metrics.contextUsedPercent > 50
                          ? 'bg-amber-400'
                          : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                    }`}
                    style={{ width: `${Math.max(2, metrics.contextUsedPercent)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>0k</span>
                  <span>64k</span>
                  <span>128k Limit</span>
                </div>
              </div>

              {/* Token Distribution Breakdown */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400">
                  Token Distribution Breakdown
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                    <span className="text-[11px] text-slate-400">User Prompt Tokens</span>
                    <p className="mt-1 font-mono text-base font-semibold text-sky-200">
                      {(metrics.promptTokens - (metrics.systemTokens || 0)).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500">User instructions</span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                    <span className="text-[11px] text-slate-400">System & Preset Tokens</span>
                    <p className="mt-1 font-mono text-base font-semibold text-amber-200">
                      {(metrics.systemTokens || 0).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500">System prompts & rules</span>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3">
                    <span className="text-[11px] text-slate-400">Completion Output Tokens</span>
                    <p className="mt-1 font-mono text-base font-semibold text-purple-200">
                      {metrics.completionTokens.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500">Codex responses & code</span>
                  </div>
                </div>
              </div>

              {/* Budget Threshold & Alert Configuration */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-300" />
                    <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider">
                      Session Budget Alert
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Budget Limit:</span>
                    <select
                      value={targetBudgetUsd}
                      onChange={(e) => setTargetBudgetUsd(Number(e.target.value))}
                      className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 font-mono text-amber-200 focus:outline-none"
                    >
                      <option value={0.25}>$0.25 USD</option>
                      <option value={0.5}>$0.50 USD</option>
                      <option value={1.0}>$1.00 USD</option>
                      <option value={2.0}>$2.00 USD</option>
                      <option value={5.0}>$5.00 USD</option>
                      <option value={10.0}>$10.00 USD</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Spent ${metrics.estimatedCostUsd.toFixed(4)} of ${targetBudgetUsd.toFixed(2)}
                    </span>
                    <span className={`font-mono font-semibold ${isOverBudget ? 'text-rose-400' : 'text-slate-300'}`}>
                      {budgetUsedPercent}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOverBudget ? 'bg-rose-500' : budgetUsedPercent > 75 ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${Math.min(100, budgetUsedPercent)}%` }}
                    />
                  </div>
                </div>

                {isOverBudget && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-200">
                    <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    <span>Session has reached your configured ${targetBudgetUsd.toFixed(2)} budget threshold.</span>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'turns' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Turn-by-Turn Prompt & Completion Usage
                </h4>
                <span className="text-xs text-slate-400">
                  {metrics.turns.length} prompt turns
                </span>
              </div>

              {metrics.turns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">
                  No turn history recorded for this session yet. Submit prompts to see turn breakdowns.
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/5 text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5">Turn #</th>
                        <th className="px-4 py-2.5">Prompt Preview</th>
                        <th className="px-4 py-2.5">Input Tokens</th>
                        <th className="px-4 py-2.5">Output Tokens</th>
                        <th className="px-4 py-2.5">Total Tokens</th>
                        <th className="px-4 py-2.5 text-right">Cost (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {metrics.turns.map((turn) => (
                        <tr key={turn.turnIndex} className="hover:bg-white/2">
                          <td className="px-4 py-2.5 text-cyan-300 font-semibold">
                            Turn #{turn.turnIndex}
                          </td>
                          <td className="px-4 py-2.5 font-sans text-slate-300 truncate max-w-xs">
                            {turn.promptPreview}
                          </td>
                          <td className="px-4 py-2.5 text-sky-300">
                            {turn.promptTokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-purple-300">
                            {turn.completionTokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-slate-200 font-semibold">
                            {turn.totalTokens.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-amber-300 font-semibold">
                            ${turn.turnCostUsd.toFixed(5)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Model Cost Comparison For This Session
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  See how much this active session volume ({metrics.totalTokens.toLocaleString()} tokens) would cost across different frontier AI models:
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.comparisons.map((comp) => {
                  const isCurrent = comp.modelName.toLowerCase().includes(metrics.model.toLowerCase()) || metrics.model.toLowerCase().includes(comp.modelName.toLowerCase())

                  return (
                    <div
                      key={comp.modelName}
                      className={`rounded-2xl border p-4 space-y-2 transition ${
                        isCurrent
                          ? 'border-cyan-400/40 bg-cyan-400/10'
                          : 'border-white/10 bg-black/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-200 font-mono">
                          {comp.modelName}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-cyan-400/20 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                            Active Model
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between border-t border-white/5 pt-2">
                        <span className="text-xs text-slate-400">Estimated Cost:</span>
                        <span className="font-mono text-base font-bold text-amber-300">
                          ${comp.estimatedCostUsd.toFixed(5)} USD
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Input: ${comp.promptCostPer1M.toFixed(2)}/1M</span>
                        <span>Output: ${comp.completionCostPer1M.toFixed(2)}/1M</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
