import { Check, Columns, FlaskConical, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import type { ApprovalRequestPayload } from '#/lib/types'

type ApprovalBarProps = {
  request: ApprovalRequestPayload | null
  busy: boolean
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
  onOpenTestRunner?: () => void
}

export default function ApprovalBar({
  request,
  busy,
  onApprove,
  onReject,
  onOpenTestRunner,
}: ApprovalBarProps) {
  if (!request) {
    return null
  }

  const isAutoApproved = request.matchedRule?.action === 'auto_approve'

  return (
    <div
      className={`border-t px-5 py-4 transition ${
        isAutoApproved
          ? 'border-cyan-400/30 bg-cyan-950/40'
          : 'border-amber-400/30 bg-amber-950/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.24em] ${
                isAutoApproved ? 'text-cyan-300' : 'text-amber-300'
              }`}
            >
              {isAutoApproved ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  Policy Auto-Approved
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Approval Required
                </>
              )}
            </span>

            {request.matchedRule && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-slate-300">
                Rule: {request.matchedRule.name}
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-slate-100">{request.description}</p>
          {request.filePath && (
            <p className="font-mono text-xs text-slate-400">{request.filePath}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenTestRunner && (
            <button
              type="button"
              onClick={onOpenTestRunner}
              className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/20"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Verify with Tests</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void onReject()}
            disabled={busy}
            className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reject</span>
          </button>

          <button
            type="button"
            onClick={() => void onApprove()}
            disabled={busy}
            className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-5 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Approve & Continue</span>
          </button>
        </div>
      </div>

      {request.diff && (
        <pre className="mt-3 max-h-48 overflow-auto rounded-2xl border border-white/10 bg-black/50 p-3 font-mono text-[11px] text-slate-300">
          {request.diff}
        </pre>
      )}
    </div>
  )
}
