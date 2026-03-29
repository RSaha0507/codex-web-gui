import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import SessionList from '#/components/SessionList'
import { APPROVAL_MODE_OPTIONS } from '#/lib/constants'
import type { ApprovalMode } from '#/lib/types'
import { createSession, getHomeData } from '#/server/functions'

export const Route = createFileRoute('/')({
  loader: async () => getHomeData(),
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const data = Route.useLoaderData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cwd, setCwd] = useState(data.settings.defaultCwd)
  const [model, setModel] = useState(data.settings.defaultModel)
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(
    data.settings.defaultApprovalMode,
  )
  const [systemPrompt, setSystemPrompt] = useState('')

  async function handleCreateSession(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const result = await createSession({
        data: {
          cwd,
          model,
          approvalMode,
          systemPrompt,
        },
      })

      await navigate({
        to: '/session/$sessionId',
        params: {
          sessionId: result.sessionId,
        },
      })
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to create the session.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <main className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_420px]">
        <section className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(9,18,28,0.92),rgba(7,11,16,0.78))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
              Browser-first Codex
            </p>
            <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
              Wrap the `codex` CLI in a live control surface.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Stream raw terminal output into the browser, track diffs as they
              happen, and keep session history in SQLite so you can reopen work
              without losing context.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/12 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
            >
              New Session
            </button>
            <div className="rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-300">
              Default cwd: {data.settings.defaultCwd}
            </div>
            <div className="rounded-full border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-300">
              DB: {data.dbInfo.path}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-slate-100">Codex CLI</p>
              <p className="mt-2 text-sm text-slate-400">
                {data.codexHealth.available
                  ? `Detected ${data.codexHealth.version}`
                  : data.codexHealth.message || 'Unavailable'}
              </p>
            </article>
            <article className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-slate-100">Approval</p>
              <p className="mt-2 text-sm text-slate-400">
                Default mode: {data.settings.defaultApprovalMode}
              </p>
            </article>
            <article className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-semibold text-slate-100">Sessions</p>
              <p className="mt-2 text-sm text-slate-400">
                {data.sessions.length} stored locally.
              </p>
            </article>
          </div>

          {!data.codexHealth.available ? (
            <div className="mt-6 rounded-[2rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              `codex` is not available in PATH. Install the CLI and restart the
              app before creating a session.
            </div>
          ) : null}

          {data.dbInfo.warning ? (
            <div className="mt-4 rounded-[2rem] border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
              {data.dbInfo.warning}
            </div>
          ) : null}
        </section>

        <aside className="rounded-[2.4rem] border border-white/10 bg-[rgba(7,11,16,0.8)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Session Picker
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">
                Recent Sessions
              </h3>
            </div>
          </div>
          <SessionList sessions={data.sessions} />
        </aside>
      </main>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <form
            onSubmit={(event) => void handleCreateSession(event)}
            className="w-full max-w-2xl rounded-[2.4rem] border border-white/10 bg-[#090d12] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
                  New Session
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-100">
                  Configure the working context
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Working directory</span>
                <input
                  value={cwd}
                  onChange={(event) => setCwd(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span>Model</span>
                <input
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                <span>Approval mode</span>
                <select
                  value={approvalMode}
                  onChange={(event) =>
                    setApprovalMode(event.target.value as ApprovalMode)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
                >
                  {APPROVAL_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.description}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                <span>Optional system prompt</span>
                <textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  rows={5}
                  className="w-full rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
                />
              </label>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/12 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Launching…' : 'Start Session'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
