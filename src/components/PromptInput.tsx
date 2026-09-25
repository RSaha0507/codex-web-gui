import { useEffect, useRef, useState } from 'react'
import { FileCode, Send, Sparkles, X } from 'lucide-react'
import type { PinnedContextFile } from '#/lib/types'

type PromptInputProps = {
  disabled: boolean
  onSubmit: (value: string, attachedFiles?: PinnedContextFile[]) => Promise<void>
  onInterrupt: () => Promise<void>
  pinnedFiles?: PinnedContextFile[]
  onRemovePinnedFile?: (path: string) => void
  onOpenContextDrawer?: () => void
}

export default function PromptInput({
  disabled,
  onSubmit,
  onInterrupt,
  pinnedFiles = [],
  onRemovePinnedFile,
  onOpenContextDrawer,
}: PromptInputProps) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`
  }, [value])

  async function submit(): Promise<void> {
    const nextValue = value.trim()
    if (!nextValue || disabled || busy) {
      return
    }

    setBusy(true)
    try {
      await onSubmit(nextValue, pinnedFiles)
      setValue('')
    } finally {
      setBusy(false)
    }
  }

  function handleInsertFileRef(filePath: string): void {
    setValue((prev) => (prev ? `${prev} @${filePath}` : `@${filePath} `))
    textareaRef.current?.focus()
  }

  return (
    <div className="border-t border-white/10 bg-black/40 px-4 py-3 space-y-2">
      {/* Pinned context files preview row */}
      {pinnedFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Context:
          </span>
          {pinnedFiles.map((file) => (
            <span
              key={file.path}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 font-mono text-[11px] text-cyan-200"
            >
              <button
                type="button"
                onClick={() => handleInsertFileRef(file.path)}
                className="hover:underline"
                title="Click to insert @reference into prompt"
              >
                @{file.name}
              </button>
              {onRemovePinnedFile && (
                <button
                  type="button"
                  onClick={() => onRemovePinnedFile(file.path)}
                  className="text-cyan-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled || busy}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void submit()
            }
          }}
          rows={1}
          placeholder={
            disabled
              ? 'Codex is executing. Press Ctrl+C to interrupt.'
              : 'Ask Codex to write code, refactor, debug, or run tests…'
          }
          className="min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
        />

        {disabled ? (
          <button
            type="button"
            onClick={() => void onInterrupt()}
            className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-400/20"
          >
            Ctrl+C
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!value.trim() || busy}
            className="flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/15 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{busy ? 'Sending…' : 'Send'}</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
        <span>`Enter` to submit • `Shift+Enter` for newlines • Pin files from sidebar</span>
        {onOpenContextDrawer && (
          <button
            type="button"
            onClick={onOpenContextDrawer}
            className="flex items-center gap-1 text-cyan-300 hover:underline"
          >
            <Sparkles className="h-3 w-3" />
            <span>Presets & Rule Files</span>
          </button>
        )}
      </div>
    </div>
  )
}
