import type { ApprovalRequestPayload } from '#/lib/types'

type ApprovalBarProps = {
  request: ApprovalRequestPayload | null
  busy: boolean
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
}

export default function ApprovalBar({
  request,
  busy,
  onApprove,
  onReject,
}: ApprovalBarProps) {
  if (!request) {
    return null
  }

  return (
    <div className="border-t border-amber-400/20 bg-amber-400/8 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
            Approval Required
          </p>
          <p className="mt-2 text-sm text-slate-100">{request.description}</p>
          {request.filePath ? (
            <p className="mt-1 text-xs text-slate-400">{request.filePath}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void onReject()}
            disabled={busy}
            className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => void onApprove()}
            disabled={busy}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Approve
          </button>
        </div>
      </div>
      {request.diff ? (
        <pre className="mt-4 max-h-56 overflow-auto rounded-3xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-slate-300">
          {request.diff}
        </pre>
      ) : null}
    </div>
  )
}
