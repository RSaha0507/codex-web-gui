import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import type { GuardrailRule } from '#/lib/types'
import {
  deleteGuardrailRuleAction,
  saveGuardrailRuleAction,
  toggleGuardrailRuleAction,
} from '#/server/functions'

type GuardrailsSettingsProps = {
  initialRules: GuardrailRule[]
}

export default function GuardrailsSettings({
  initialRules,
}: GuardrailsSettingsProps) {
  const [rules, setRules] = useState<GuardrailRule[]>(initialRules)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPattern, setNewPattern] = useState('')
  const [newAction, setNewAction] =
    useState<GuardrailRule['action']>('auto_approve')

  async function handleToggle(id: string, currentEnabled: boolean): Promise<void> {
    const res = await toggleGuardrailRuleAction({
      data: { id, enabled: !currentEnabled },
    })
    setRules((prev) => prev.map((r) => (r.id === id ? res.rule : r)))
  }

  async function handleSaveNewRule(): Promise<void> {
    if (!newName.trim() || !newPattern.trim()) return
    const res = await saveGuardrailRuleAction({
      data: {
        name: newName.trim(),
        description: newDesc.trim(),
        pattern: newPattern.trim(),
        action: newAction,
        enabled: true,
      },
    })
    setRules((prev) => [res.rule, ...prev])
    setIsAdding(false)
    setNewName('')
    setNewDesc('')
    setNewPattern('')
  }

  async function handleDelete(id: string): Promise<void> {
    await deleteGuardrailRuleAction({ data: { id } })
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            Guardrails & Auto-Approval Policies
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Automatically approve safe commands (e.g. read-only inspections, test runs) while enforcing strict human approval for risky operations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{isAdding ? 'Cancel' : 'New Rule'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">
            Create Policy Rule
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Rule Name (e.g. Auto-approve Linter)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400/40"
            />
            <select
              value={newAction}
              onChange={(e) =>
                setNewAction(e.target.value as GuardrailRule['action'])
              }
              className="rounded-xl border border-white/10 bg-[#090d12] px-3 py-2 text-xs text-slate-200 outline-none"
            >
              <option value="auto_approve">Auto-Approve (Skip Prompt)</option>
              <option value="require_approval">
                Strict Manual Approval Required
              </option>
              <option value="block">Block Execution</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Regex pattern (e.g. ^(eslint|prettier|npm run lint))"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/40"
          />
          <input
            type="text"
            placeholder="Description / note (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400/40"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveNewRule}
              className="rounded-full border border-cyan-400/40 bg-cyan-400/20 px-4 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-400/30"
            >
              Save Rule
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-2">
        {rules.map((rule) => {
          const isAutoApprove = rule.action === 'auto_approve'
          return (
            <div
              key={rule.id}
              className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                rule.enabled
                  ? 'border-white/10 bg-black/30'
                  : 'border-white/5 bg-black/10 opacity-50'
              }`}
            >
              <div className="min-w-0 pr-4 space-y-1">
                <div className="flex items-center gap-2">
                  {isAutoApprove ? (
                    <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                  )}
                  <h4 className="text-sm font-semibold text-slate-100 truncate">
                    {rule.name}
                  </h4>
                  <span
                    className={`rounded-full px-2 py-0.2 text-[9px] font-semibold uppercase ${
                      isAutoApprove
                        ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30'
                        : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                    }`}
                  >
                    {rule.action.replace('_', ' ')}
                  </span>
                  {rule.isSystem && (
                    <span className="text-[10px] text-slate-500">
                      (Built-in Policy)
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">{rule.description}</p>
                <p className="font-mono text-[11px] text-slate-500 truncate">
                  Pattern: <code className="text-slate-300">{rule.pattern}</code>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(rule.id, rule.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rule.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>

                {!rule.isSystem && (
                  <button
                    type="button"
                    onClick={() => handleDelete(rule.id)}
                    className="rounded-full border border-white/5 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
