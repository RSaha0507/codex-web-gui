import { useState } from 'react'
import { Activity, X } from 'lucide-react'
import type { ActivityLogRecord } from '#/lib/types'
import ActivityLogsViewer from './ActivityLogsViewer'

type ActivityLogsModalProps = {
  isOpen: boolean
  onClose: () => void
  logs: ActivityLogRecord[]
  sessionId?: string
  onClearLogs?: () => void
}

export default function ActivityLogsModal({
  isOpen,
  onClose,
  logs,
  sessionId,
  onClearLogs,
}: ActivityLogsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6">
      <div className="flex max-h-[92vh] h-[850px] w-full max-w-4xl flex-col rounded-[2.4rem] border border-white/10 bg-[#090d12] p-6 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                Workspace Activity & Audit Logs
              </h3>
              <p className="text-xs text-slate-400">
                Comprehensive audit trail of commands, file diffs, rollbacks, test suites, and approvals
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <ActivityLogsViewer
            logs={logs}
            sessionId={sessionId}
            onClearLogs={onClearLogs}
          />
        </div>
      </div>
    </div>
  )
}
