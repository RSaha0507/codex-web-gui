import { useEffect, useRef, useState } from 'react'

type PromptInputProps = {
  disabled: boolean
  onSubmit: (value: string) => Promise<void>
  onInterrupt: () => Promise<void>
}

export default function PromptInput({
  disabled,
  onSubmit,
  onInterrupt,
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
      await onSubmit(nextValue)
      setValue('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-white/10 bg-black/40 px-4 py-4">
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
            disabled ? 'Codex is busy. Use Ctrl+C or wait for the stream to settle.' : 'Type a prompt and press Enter'
          }
          className="min-h-12 flex-1 resize-none rounded-3xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
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
            className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        `Enter` submits. `Shift+Enter` inserts a newline.
      </p>
    </div>
  )
}
