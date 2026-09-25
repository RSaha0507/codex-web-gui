import { useState } from 'react'
import {
  BookOpen,
  Check,
  FileCheck,
  FileCode,
  FolderTree,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import type {
  DiscoveredRuleFile,
  InstructionPreset,
  PinnedContextFile,
} from '#/lib/types'
import { deletePresetAction, savePresetAction } from '#/server/functions'

type ContextDrawerProps = {
  pinnedFiles: PinnedContextFile[]
  onAddPinnedFile: (file: PinnedContextFile) => void
  onRemovePinnedFile: (path: string) => void
  discoveredRules: DiscoveredRuleFile[]
  presets: InstructionPreset[]
  onApplyPreset: (preset: InstructionPreset | DiscoveredRuleFile) => void
  sessionId: string
}

export default function ContextDrawer({
  pinnedFiles,
  onAddPinnedFile,
  onRemovePinnedFile,
  discoveredRules,
  presets,
  onApplyPreset,
  sessionId,
}: ContextDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'files' | 'presets' | 'rules'>('files')
  const [searchQuery, setSearchQuery] = useState('')
  const [customPresetName, setCustomPresetName] = useState('')
  const [customPresetPrompt, setCustomPresetPrompt] = useState('')
  const [customPresetCategory, setCustomPresetCategory] = useState<
    InstructionPreset['category']
  >('custom')
  const [isCreatingPreset, setIsCreatingPreset] = useState(false)
  const [presetList, setPresetList] = useState<InstructionPreset[]>(presets)
  const [filePathInput, setFilePathInput] = useState('')

  function handleAddManualFile(): void {
    const trimmed = filePathInput.trim()
    if (!trimmed) return
    const name = trimmed.split('/').pop() || trimmed
    onAddPinnedFile({
      path: trimmed,
      name,
    })
    setFilePathInput('')
  }

  async function handleSaveNewPreset(): Promise<void> {
    if (!customPresetName.trim() || !customPresetPrompt.trim()) return
    const result = await savePresetAction({
      data: {
        name: customPresetName.trim(),
        description: 'Custom project instructions',
        systemPrompt: customPresetPrompt.trim(),
        category: customPresetCategory,
        tags: ['Custom'],
      },
    })
    setPresetList((prev) => [result.preset, ...prev])
    setIsCreatingPreset(false)
    setCustomPresetName('')
    setCustomPresetPrompt('')
  }

  async function handleDeletePreset(id: string): Promise<void> {
    await deletePresetAction({ data: { id } })
    setPresetList((prev) => prev.filter((p) => p.id !== id))
  }

  const filteredPresets = presetList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.systemPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <>
      {/* Context Trigger Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-white/5 bg-black/20 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-cyan-300">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Context & Rules:</span>
        </span>

        {/* Pinned Files Chips */}
        {pinnedFiles.length > 0 ? (
          pinnedFiles.map((file) => (
            <span
              key={file.path}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-100 font-mono"
            >
              <FileCode className="h-3 w-3 text-cyan-300" />
              <span className="truncate max-w-[130px]">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemovePinnedFile(file.path)}
                className="text-cyan-300 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-slate-500 italic">No files pinned to next prompt</span>
        )}

        {/* Open Drawer Button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="ml-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <Sparkles className="h-3 w-3 text-amber-300" />
          <span>Presets & Attachments ({discoveredRules.length + presetList.length})</span>
        </button>
      </div>

      {/* Slide-out Context & Rule Presets Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:p-6">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#090d12] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
                  Context Builder & Rules
                </p>
                <h3 className="text-xl font-semibold text-slate-100">
                  Attach Files & Persona Guidelines
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 bg-white/2 px-6">
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === 'files'
                    ? 'border-cyan-400 text-cyan-200'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderTree className="h-4 w-4" />
                <span>Pinned Files ({pinnedFiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === 'rules'
                    ? 'border-cyan-400 text-cyan-200'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCheck className="h-4 w-4" />
                <span>Discovered Rules ({discoveredRules.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === 'presets'
                    ? 'border-cyan-400 text-cyan-200'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Instruction Presets ({presetList.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: PINNED FILES & ATTACHMENTS */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs text-slate-300">
                    💡 Pinned files are injected into your next prompt as live context references (`@file`). Click the Pin icon in the left File Tree or enter paths below.
                  </div>

                  {/* Manual Path Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. src/server/pty.ts or package.json"
                      value={filePathInput}
                      onChange={(e) => setFilePathInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddManualFile()
                      }}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-cyan-400/40 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualFile}
                      className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/15 px-4 py-2.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/25"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Pin File</span>
                    </button>
                  </div>

                  {/* Current Pinned Files List */}
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Currently Attached Files ({pinnedFiles.length})
                    </p>
                    {pinnedFiles.length === 0 ? (
                      <div className="rounded-2xl border border-white/5 bg-black/20 p-6 text-center text-xs text-slate-500">
                        No files attached yet. Pin files from the sidebar file tree or type the relative path above.
                      </div>
                    ) : (
                      pinnedFiles.map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 font-mono">
                            <FileCode className="h-4 w-4 text-cyan-400 shrink-0" />
                            <span className="font-medium text-slate-200 truncate">
                              {file.path}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemovePinnedFile(file.path)}
                            className="rounded-full border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20"
                            title="Remove file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DISCOVERED WORKSPACE RULES (.cursorrules, CODEX.md) */}
              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Auto-discovered project instruction files detected in this repository:
                  </p>

                  {discoveredRules.length === 0 ? (
                    <div className="rounded-2xl border border-white/5 bg-black/20 p-6 text-center text-xs text-slate-500">
                      No rule files found (looked for `CODEX.md`, `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`).
                    </div>
                  ) : (
                    discoveredRules.map((rule) => (
                      <div
                        key={rule.path}
                        className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-mono">
                            <FileCheck className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm font-semibold text-slate-100">
                              {rule.name}
                            </span>
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 uppercase">
                              {rule.fileType}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onApplyPreset(rule)
                              setIsOpen(false)
                            }}
                            className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200 transition hover:bg-emerald-500/25"
                          >
                            <Check className="h-3 w-3" />
                            <span>Inject into Prompt</span>
                          </button>
                        </div>
                        <pre className="max-h-36 overflow-auto rounded-xl border border-white/5 bg-black/50 p-3 font-mono text-[11px] text-slate-300">
                          {rule.content}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: INSTRUCTION PRESETS CATALOG */}
              {activeTab === 'presets' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search presets by keyword, persona, stack…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400/40"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCreatingPreset(!isCreatingPreset)}
                      className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isCreatingPreset ? 'Cancel' : 'New Preset'}</span>
                    </button>
                  </div>

                  {/* Create Custom Preset Form */}
                  {isCreatingPreset && (
                    <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">
                        Create Custom Instruction Preset
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Preset Title (e.g. Next.js 15 & Tailwind)"
                          value={customPresetName}
                          onChange={(e) => setCustomPresetName(e.target.value)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400/40"
                        />
                        <select
                          value={customPresetCategory}
                          onChange={(e) =>
                            setCustomPresetCategory(
                              e.target.value as InstructionPreset['category'],
                            )
                          }
                          className="rounded-xl border border-white/10 bg-[#090d12] px-3 py-2 text-xs text-slate-200 outline-none"
                        >
                          <option value="guideline">Guideline</option>
                          <option value="testing">Testing / TDD</option>
                          <option value="security">Security & Defensive</option>
                          <option value="persona">Persona / Architect</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <textarea
                        placeholder="System prompt instructions to inject..."
                        value={customPresetPrompt}
                        onChange={(e) => setCustomPresetPrompt(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-100 outline-none focus:border-cyan-400/40 font-mono"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveNewPreset}
                          className="rounded-full border border-cyan-400/40 bg-cyan-400/20 px-4 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/30"
                        >
                          Save Preset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Presets List */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold text-slate-100">
                              {preset.name}
                            </h5>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-slate-400 uppercase">
                              {preset.category}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                            {preset.description}
                          </p>
                          {preset.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {preset.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400"
                                >
                                  <Tag className="h-2.5 w-2.5 text-cyan-300" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          {!preset.isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleDeletePreset(preset.id)}
                              className="text-slate-500 hover:text-rose-400 text-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500">
                              Built-in
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onApplyPreset(preset)
                              setIsOpen(false)
                            }}
                            className="flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/20"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Apply Preset</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
