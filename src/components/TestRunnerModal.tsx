import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Copy,
  FlaskConical,
  Play,
  RotateCw,
  Send,
  Terminal,
  X,
} from 'lucide-react'
import type { TestRunResult } from '#/lib/types'
import { runProjectTests } from '#/server/functions'

type TestRunnerModalProps = {
  sessionId: string
  isOpen: boolean
  onClose: () => void
  onSendErrorToPrompt?: (errorText: string) => void
  defaultCommand?: string
}

export default function TestRunnerModal({
  sessionId,
  isOpen,
  onClose,
  onSendErrorToPrompt,
  defaultCommand = 'npm test',
}: TestRunnerModalProps) {
  const [command, setCommand] = useState(defaultCommand)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TestRunResult | null>(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  async function handleRunTests(): Promise<void> {
    setRunning(true)
    setResult(null)
    try {
      const res = await runProjectTests({
        data: {
          sessionId,
          command: command.trim() || 'npm test',
        },
      })
      setResult(res)
    } finally {
      setRunning(false)
    }
  }

  function handleCopyOutput(): void {
    if (!result) return
    const text = `${result.stdout}\n${result.stderr}`
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSendFailureToCodex(): void {
    if (!result || !onSendErrorToPrompt) return
    const message = `The test suite failed with exit code ${result.exitCode}. Please fix the errors:\n\nTest Output:\n${result.stdout.slice(-1000)}\n\nErrors:\n${result.stderr.slice(-1000)}`
    onSendErrorToPrompt(message)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#090d12] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
                Verification Engine
              </p>
              <h3 className="text-lg font-semibold text-slate-100">
                Test Verification Runner
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command Configuration Bar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/2 px-6 py-3">
          <div className="relative flex-1">
            <Terminal className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. npm test, npx vitest run, pytest"
              className="w-full rounded-2xl border border-white/10 bg-white/5 pl-9 pr-4 py-2 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleRunTests()}
            disabled={running}
            className="flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/15 px-5 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-50"
          >
            {running ? (
              <>
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                <span>Running Tests…</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Test Suite</span>
              </>
            )}
          </button>
        </div>

        {/* Result & Output Terminal View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {running && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
              <RotateCw className="h-8 w-8 animate-spin text-cyan-400" />
              <p className="text-xs font-medium text-slate-200">
                Executing `{command}` in workspace...
              </p>
              <p className="text-[11px] text-slate-500">
                Evaluating test suite results before approval.
              </p>
            </div>
          )}

          {!running && !result && (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 space-y-2">
              <FlaskConical className="h-8 w-8 text-slate-600" />
              <p className="font-medium text-slate-300">No test run executed yet</p>
              <p>Click "Run Test Suite" to verify the workspace changes.</p>
            </div>
          )}

          {!running && result && (
            <div className="space-y-4">
              {/* Test Status Banner */}
              <div
                className={`flex items-center justify-between rounded-2xl border p-4 ${
                  result.passed
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.passed ? (
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-rose-400" />
                  )}
                  <div>
                    <h4 className="text-sm font-semibold">
                      {result.passed
                        ? 'All Tests Passed Successfully'
                        : `Test Suite Failed (Exit Code ${result.exitCode})`}
                    </h4>
                    <p className="text-xs opacity-80">
                      Duration: {(result.durationMs / 1000).toFixed(2)}s •
                      Command: `{result.command}`
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-slate-300 hover:bg-black/50"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  {!result.passed && onSendErrorToPrompt && (
                    <button
                      type="button"
                      onClick={handleSendFailureToCodex}
                      className="flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-3.5 py-1 text-xs font-medium text-rose-100 hover:bg-rose-500/30"
                    >
                      <Send className="h-3 w-3" />
                      <span>Ask Codex to Fix</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Output Log */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Test Execution Log:
                </p>
                <pre className="max-h-80 overflow-auto rounded-2xl border border-white/10 bg-[#05080c] p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap">
                  {result.stdout || 'No stdout output.'}
                  {result.stderr ? `\n--- STDERR ---\n${result.stderr}` : ''}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
