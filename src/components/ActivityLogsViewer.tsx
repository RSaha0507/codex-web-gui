import { useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  FileCode,
  FileDiff,
  FlaskConical,
  History,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  User,
  Zap,
} from 'lucide-react'
import type { ActivityActor, ActivityLogEventType, ActivityLogRecord } from '#/lib/types'

type ActivityLogsViewerProps = {
  logs: ActivityLogRecord[]
  sessionId?: string
  onRefresh?: () => void
  onClearLogs?: () => void
}

const EVENT_TYPE_CATEGORIES: Record<
  string,
  { label: string; types: ActivityLogEventType[] }
> = {
  all: { label: 'All Events', types: [] },
  prompts: { label: 'Prompts', types: ['prompt_submitted'] },
  diffs: {
    label: 'Diffs & Patches',
    types: [
      'file_diff_staged',
      'hunk_accepted',
      'hunk_rejected',
      'patch_applied',
      'direct_file_edited',
    ],
  },
  approvals: {
    label: 'Approvals & Policies',
    types: [
      'auto_approved_by_rule',
      'manual_approved',
      'manual_rejected',
      'guardrail_updated',
    ],
  },
  tests: {
    label: 'Test Suite',
    types: ['test_run_started', 'test_run_passed', 'test_run_failed'],
  },
  checkpoints: {
    label: 'Rollbacks & Checkpoints',
    types: ['checkpoint_created', 'checkpoint_rollback'],
  },
  sessions: {
    label: 'Session State',
    types: [
      'session_created',
      'session_ended',
      'session_interrupted',
      'workspace_switched',
    ],
  },
}

export default function ActivityLogsViewer({
  logs,
  sessionId,
  onRefresh,
  onClearLogs,
}: ActivityLogsViewerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [actorFilter, setActorFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const filteredLogs = logs.filter((log) => {
    // Filter by session if provided
    if (sessionId && log.sessionId && log.sessionId !== sessionId) {
      return false
    }

    // Filter by category
    if (activeCategory !== 'all' && activeCategory in EVENT_TYPE_CATEGORIES) {
      const allowedTypes = EVENT_TYPE_CATEGORIES[activeCategory].types
      if (!allowedTypes.includes(log.eventType)) {
        return false
      }
    }

    // Filter by actor
    if (actorFilter !== 'all' && log.actor !== actorFilter) {
      return false
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchSummary = log.summary.toLowerCase().includes(q)
      const matchType = log.eventType.toLowerCase().includes(q)
      const matchDetails = JSON.stringify(log.details).toLowerCase().includes(q)
      return matchSummary || matchType || matchDetails
    }

    return true
  })

  function getEventBadge(eventType: ActivityLogEventType) {
    switch (eventType) {
      case 'prompt_submitted':
        return {
          icon: <User className="h-3.5 w-3.5 text-sky-400" />,
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
          label: 'Prompt',
        }
      case 'file_diff_staged':
      case 'patch_applied':
      case 'direct_file_edited':
      case 'hunk_accepted':
        return {
          icon: <FileDiff className="h-3.5 w-3.5 text-purple-400" />,
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
          label: 'File Patch',
        }
      case 'manual_approved':
      case 'auto_approved_by_rule':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          label: 'Approved',
        }
      case 'manual_rejected':
      case 'hunk_rejected':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5 text-rose-400" />,
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          label: 'Rejected',
        }
      case 'test_run_passed':
        return {
          icon: <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />,
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          label: 'Test Pass',
        }
      case 'test_run_failed':
        return {
          icon: <FlaskConical className="h-3.5 w-3.5 text-rose-400" />,
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          label: 'Test Fail',
        }
      case 'checkpoint_rollback':
        return {
          icon: <RotateCcw className="h-3.5 w-3.5 text-amber-400" />,
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          label: 'Rollback',
        }
      case 'checkpoint_created':
        return {
          icon: <History className="h-3.5 w-3.5 text-blue-400" />,
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
          label: 'Checkpoint',
        }
      default:
        return {
          icon: <Activity className="h-3.5 w-3.5 text-cyan-400" />,
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          label: eventType.replace(/_/g, ' '),
        }
    }
  }

  function getActorBadge(actor: ActivityActor) {
    switch (actor) {
      case 'user':
        return (
          <span className="rounded bg-sky-400/10 px-1.5 py-0.5 text-[10px] text-sky-300 font-mono">
            user
          </span>
        )
      case 'guardrail':
        return (
          <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300 font-mono">
            guardrail
          </span>
        )
      case 'codex':
        return (
          <span className="rounded bg-purple-400/10 px-1.5 py-0.5 text-[10px] text-purple-300 font-mono">
            codex
          </span>
        )
      default:
        return (
          <span className="rounded bg-slate-400/10 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
            system
          </span>
        )
    }
  }

  function handleExportJson() {
    const jsonStr = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `codex-activity-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportCsv() {
    const headers = ['Timestamp', 'Event Type', 'Actor', 'Summary', 'Session ID']
    const rows = filteredLogs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.eventType,
      log.actor,
      `"${log.summary.replace(/"/g, '""')}"`,
      log.sessionId || '',
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `codex-activity-logs-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Top Header & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">
            Activity & Audit Logs
          </h3>
          <span className="rounded-full bg-cyan-400/15 border border-cyan-400/30 px-2 py-0.5 text-[11px] font-mono text-cyan-200">
            {filteredLogs.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Actions */}
          <button
            type="button"
            onClick={handleExportJson}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
            title="Download JSON audit log"
          >
            <Download className="h-3 w-3" />
            <span>JSON</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
            title="Download CSV report"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </button>

          {onClearLogs && (
            confirmClear ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearLogs()
                    setConfirmClear(false)
                  }}
                  className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-500/30"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-full px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-full border border-white/10 p-1 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
                title="Clear activity log"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity events, files, rules..."
            className="w-full rounded-xl border border-white/10 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
          />
        </div>

        {/* Categories Tab Selector */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {Object.entries(EVENT_TYPE_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`rounded-full px-2.5 py-1 font-medium transition ${
                activeCategory === key
                  ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/40'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Event Stream List */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <Activity className="mx-auto h-7 w-7 text-slate-500/50" />
            <p className="mt-2 text-xs font-medium text-slate-400">
              No activity logs found for this filter
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Events like prompts, staged diffs, test executions, and approvals will appear here in real-time.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getEventBadge(log.eventType)
            const isExpanded = expandedLogId === log.id
            const hasDetails = Object.keys(log.details).length > 0

            return (
              <div
                key={log.id}
                className="group rounded-2xl border border-white/10 bg-black/30 p-3 transition hover:border-cyan-400/30 hover:bg-black/45"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 break-words">
                        {log.summary}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        {getActorBadge(log.actor)}
                        <span>•</span>
                        <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                        {log.sessionId && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[9px] text-slate-500">
                              sess:{log.sessionId.slice(0, 8)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {hasDetails && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLogId(isExpanded ? null : log.id)
                      }
                      className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-white hover:bg-white/10"
                      title="Inspect event details"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Expanded Details JSON Drawer */}
                {isExpanded && hasDetails && (
                  <div className="mt-2.5 rounded-xl border border-white/5 bg-black/60 p-2.5 text-[11px] font-mono text-slate-300">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5 text-[10px] text-slate-500 uppercase">
                      <span>Event Payload Details</span>
                      <span>JSON</span>
                    </div>
                    <pre className="overflow-x-auto text-[10px] text-cyan-200/90 whitespace-pre-wrap">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
