import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FlaskConical, Shield, Sliders } from 'lucide-react'
import GuardrailsSettings from '#/components/GuardrailsSettings'
import { THEME_OPTIONS, THEME_STORAGE_KEY } from '#/lib/constants'
import type { ThemeMode } from '#/lib/types'
import { getSettingsData, saveSettings } from '#/server/functions'

export const Route = createFileRoute('/settings')({
  loader: async () => getSettingsData(),
  component: SettingsPage,
})

function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode
  window.localStorage.setItem(THEME_STORAGE_KEY, mode)
}

function SettingsPage() {
  const data = Route.useLoaderData()
  const [form, setForm] = useState(data.settings)
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    setTheme(stored === 'light' ? 'light' : 'dark')
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setStatus(null)

    try {
      const result = await saveSettings({
        data: {
          ...form,
        },
      })
      setForm(result.settings)
      setStatus('Settings saved successfully.')
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Failed to save settings.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_380px]">
        {/* Environment & Configuration Form */}
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="rounded-[2.4rem] border border-white/10 bg-[rgba(7,11,16,0.85)] p-6 sm:p-8 shadow-[0_28px_90px_rgba(0,0,0,0.28)] space-y-6"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Runtime Configuration
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-100">
              Environment & Model Defaults
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs text-slate-300 sm:col-span-2">
              <span>OPENAI_API_KEY</span>
              <input
                type="password"
                value={form.openAiApiKey}
                placeholder="sk-..."
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    openAiApiKey: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
              />
            </label>

            <label className="space-y-1.5 text-xs text-slate-300">
              <span>Default Model</span>
              <input
                value={form.defaultModel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    defaultModel: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
              />
            </label>

            <label className="space-y-1.5 text-xs text-slate-300">
              <span>Default Approval Mode</span>
              <select
                value={form.defaultApprovalMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    defaultApprovalMode: event.target.value as typeof form.defaultApprovalMode,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#090d12] px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-cyan-400/40"
              >
                <option value="suggest">suggest</option>
                <option value="auto-edit">auto-edit</option>
                <option value="full-auto">full-auto</option>
              </select>
            </label>

            <label className="space-y-1.5 text-xs text-slate-300 sm:col-span-2">
              <span>Default Working Directory</span>
              <input
                value={form.defaultCwd}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    defaultCwd: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
              />
            </label>

            <label className="space-y-1.5 text-xs text-slate-300 sm:col-span-2">
              <span>Verification Test Command</span>
              <input
                value={form.testCommand || 'npm test'}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    testCommand: event.target.value,
                  }))
                }
                placeholder="e.g. npm test or npx vitest run"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
              />
            </label>

            <label className="space-y-1.5 text-xs text-slate-300 sm:col-span-2">
              <span>SQLite Data Directory</span>
              <input
                value={form.dataDir}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dataDir: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
              />
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span>Theme:</span>
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as ThemeMode)}
                className="rounded-xl border border-white/10 bg-[#090d12] px-3 py-1.5 text-xs text-slate-100"
              >
                {THEME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/15 px-6 py-2.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save Settings'}
            </button>
          </div>

          {status && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200">
              {status}
            </div>
          )}
        </form>

        {/* System Diagnostics Info */}
        <aside className="space-y-4 rounded-[2.4rem] border border-white/10 bg-[rgba(7,11,16,0.85)] p-6 shadow-xl">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Codex CLI Diagnostic
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {data.codexHealth.available
                ? `Detected ${data.codexHealth.version}`
                : data.codexHealth.message || 'Unavailable'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Database Path
            </p>
            <p className="mt-1 break-words font-mono text-xs text-slate-300">
              {data.dbInfo.path}
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300">Real-time Persistence</p>
            <p>
              Session streams, checkpoints, test logs, file snapshots, and guardrail policies are persisted in SQLite WAL mode.
            </p>
          </div>
        </aside>
      </div>

      {/* Guardrails Policies & Rules Section */}
      <section className="rounded-[2.4rem] border border-white/10 bg-[rgba(7,11,16,0.85)] p-6 sm:p-8 shadow-xl">
        <GuardrailsSettings initialRules={data.guardrailRules} />
      </section>
    </main>
  )
}
