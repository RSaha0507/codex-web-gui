import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  Coins,
  FolderGit2,
  FolderPlus,
  Folders,
  Plus,
  Shield,
  Sparkles,
  Terminal,
} from 'lucide-react'
import ActivityLogsModal from '#/components/ActivityLogsModal'
import SessionList from '#/components/SessionList'
import { APPROVAL_MODE_OPTIONS } from '#/lib/constants'
import type { ApprovalMode, InstructionPreset } from '#/lib/types'
import {
  clearActivityLogsFn,
  createSession,
  getHomeData,
} from '#/server/functions'

export const Route = createFileRoute('/')({
  loader: async () => getHomeData(),
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const data = Route.useLoaderData()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  const [activityLogs, setActivityLogs] = useState(data.activityLogs)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cwd, setCwd] = useState(data.settings.defaultCwd)
  const [model, setModel] = useState(data.settings.defaultModel)
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(
    data.settings.defaultApprovalMode,
  )
  const [systemPrompt, setSystemPrompt] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')

  function handleSelectPreset(preset: InstructionPreset): void {
    setSelectedPresetId(preset.id)
    setSystemPrompt(preset.systemPrompt)
  }

  async function handleClearLogs(): Promise<void> {
    await clearActivityLogsFn({ data: {} })
    setActivityLogs([])
  }

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

  function handleQuickStartWorkspace(workspacePath: string): void {
    setCwd(workspacePath)
    setIsModalOpen(true)
  }

  return (
    <>
      <main className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_440px]">
        {/* Left Hero & Workspace Repositories Dashboard */}
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(9,18,28,0.92),rgba(7,11,16,0.8))] p-6 sm:p-8 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                Browser-First Codex Control Room
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Command Codex with Live Patch Workbenches & Rollbacks.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Granular hunk-by-hunk diff staging, side-by-side split review, direct in-browser patch edits, instruction preset pinning, timeline checkpoint rollbacks, real-time token tracking, and auto-approval guardrails.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/15 px-6 py-3.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25 shadow-lg shadow-cyan-500/10"
              >
                <Plus className="h-4 w-4" />
                <span>New Session</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLogsModalOpen(true)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Activity Audit Logs</span>
              </button>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-3 text-xs text-slate-300">
                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                <span>Default cwd: {data.settings.defaultCwd}</span>
              </div>
            </div>

            {/* Quick Metrics & Health Badges */}
            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              <article className="rounded-[2rem] border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Codex CLI
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {data.codexHealth.available
                    ? `Detected ${data.codexHealth.version}`
                    : data.codexHealth.message || 'Unavailable'}
                </p>
              </article>
              <article className="rounded-[2rem] border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Guardrails & Policies
                </p>
                <p className="mt-1 text-sm font-semibold text-cyan-200 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  {data.guardrailRules.filter((r) => r.enabled).length} active policies
                </p>
              </article>
              <article className="rounded-[2rem] border border-white/10 bg-black/30 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Instruction Presets
                </p>
                <p className="mt-1 text-sm font-semibold text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  {data.presets.length} presets available
                </p>
              </article>
              <article
                onClick={() => setIsLogsModalOpen(true)}
                className="rounded-[2rem] border border-white/10 bg-black/30 p-4 cursor-pointer hover:border-cyan-400/30 transition"
              >
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Activity Audit
                </p>
                <p className="mt-1 text-sm font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  {activityLogs.length} events logged
                </p>
              </article>
            </div>

            {!data.codexHealth.available && (
              <div className="mt-6 rounded-[2rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                `codex` is not available in PATH. Install the CLI and restart before creating a session.
              </div>
            )}
          </section>

          {/* Recent Repositories / Workspaces Dashboard */}
          <section className="rounded-[2.4rem] border border-white/10 bg-[rgba(7,11,16,0.85)] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-slate-100">
                  Recent Workspaces & Repositories
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 text-xs text-cyan-300 hover:underline"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>Add Workspace</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {data.workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => handleQuickStartWorkspace(ws.path)}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 cursor-pointer transition hover:border-cyan-400/40 hover:bg-cyan-400/5 group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-slate-100 group-hover:text-cyan-200">
                      {ws.name}
                    </h4>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                      {ws.sessionCount} sessions
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-400 truncate">
                    {ws.path}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Session History List */}
        <aside className="rounded-[2.4rem] border border-white/10 bg-[rgba(7,11,16,0.85)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] flex flex-col">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Session History
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-100">
                Stored Sessions ({data.sessions.length})
              </h3>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SessionList sessions={data.sessions} />
          </div>
        </aside>
      </main>

      {/* Global Activity Logs Modal */}
      <ActivityLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        logs={activityLogs}
        onClearLogs={handleClearLogs}
      />

      {/* New Session Configuration Modal with Presets & Workspaces */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6">
          <form
            onSubmit={(event) => void handleCreateSession(event)}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.4rem] border border-white/10 bg-[#090d12] p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
                  New Session
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-100">
                  Configure Working Context & Presets
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Instruction Preset Quick Picker */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Select Instruction Preset (Optional):
              </span>
              <div className="grid gap-2 sm:grid-cols-2 max-h-44 overflow-y-auto pr-1">
                {data.presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      selectedPresetId === preset.id
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-white/10 bg-white/3 hover:bg-white/6'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-200">
                      {preset.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs text-slate-300 sm:col-span-2">
                <span>Working Directory (cwd)</span>
                <input
                  value={cwd}
                  onChange={(event) => setCwd(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
                />
              </label>

              <label className="space-y-1.5 text-xs text-slate-300">
                <span>Model</span>
                <input
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
                />
              </label>

              <label className="space-y-1.5 text-xs text-slate-300">
                <span>Approval Mode</span>
                <select
                  value={approvalMode}
                  onChange={(event) =>
                    setApprovalMode(event.target.value as ApprovalMode)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#090d12] px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-cyan-400/40"
                >
                  {APPROVAL_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.description}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs text-slate-300 sm:col-span-2">
                <span>System Instructions / Injected Guidelines</span>
                <textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  rows={4}
                  placeholder="e.g. You are a senior engineer following strict TDD..."
                  className="w-full rounded-2xl border border-white/10 bg-white/6 p-3 text-xs text-slate-100 outline-none focus:border-cyan-400/40 font-mono"
                />
              </label>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-white/10 px-5 py-2.5 text-xs text-slate-400 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/15 px-6 py-2.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-50"
              >
                {busy ? 'Spawning Session…' : 'Start Session'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
