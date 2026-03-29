import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
      setStatus('Settings saved.')
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Failed to save settings.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_360px]">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-[2.4rem] border border-white/10 bg-[rgba(7,11,16,0.84)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
          Environment
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-100">
          Runtime defaults and local persistence
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
            <span>OPENAI_API_KEY</span>
            <input
              type="password"
              value={form.openAiApiKey}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  openAiApiKey: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Default model</span>
            <input
              value={form.defaultModel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultModel: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Default approval mode</span>
            <select
              value={form.defaultApprovalMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultApprovalMode: event.target.value as typeof form.defaultApprovalMode,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
            >
              <option value="suggest">suggest</option>
              <option value="auto-edit">auto-edit</option>
              <option value="full-auto">full-auto</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
            <span>Default working directory</span>
            <input
              value={form.defaultCwd}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultCwd: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
            <span>SQLite data directory</span>
            <input
              value={form.dataDir}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dataDir: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Host</span>
            <input
              value={form.host}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  host: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Port</span>
            <input
              value={form.port}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  port: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Theme</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as ThemeMode)}
              className="w-40 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/40"
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
            className="rounded-full border border-cyan-400/30 bg-cyan-400/12 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {status ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">
            {status}
          </div>
        ) : null}
      </form>

      <aside className="space-y-4 rounded-[2.4rem] border border-white/10 bg-[rgba(7,11,16,0.8)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <p className="text-sm font-semibold text-slate-100">Codex CLI</p>
          <p className="mt-2 text-sm text-slate-400">
            {data.codexHealth.available
              ? `Detected ${data.codexHealth.version}`
              : data.codexHealth.message || 'Unavailable'}
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
          <p className="text-sm font-semibold text-slate-100">Database</p>
          <p className="mt-2 break-words text-sm text-slate-400">
            {data.dbInfo.path}
          </p>
          {data.dbInfo.warning ? (
            <p className="mt-2 text-sm text-amber-200">{data.dbInfo.warning}</p>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 text-sm text-slate-400">
          Host and port changes affect the dev or preview server on the next
          restart. Session spawning reads the `.env` file directly, so API key
          and model updates apply immediately.
        </div>
      </aside>
    </main>
  )
}
