import { useEffect, useEffectEvent, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'
import { XTERM_THEME } from '#/lib/constants'
import type { StreamEventEnvelope } from '#/lib/types'
import { resizePty } from '#/server/functions'

type TerminalProps = {
  sessionId: string
  historyAnsi: string
  connectLive: boolean
  onEvent: (event: StreamEventEnvelope) => void
  onConnectionStatusChange: (
    status: 'idle' | 'connecting' | 'live' | 'disconnected',
  ) => void
}

export default function Terminal({
  sessionId,
  historyAnsi,
  connectLive,
  onEvent,
  onConnectionStatusChange,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handleEvent = useEffectEvent(onEvent)
  const handleConnectionStatusChange = useEffectEvent(onConnectionStatusChange)

  useEffect(() => {
    let disposed = false
    let cleanupResize = () => {}
    let closeStream = () => {}

    async function setup(): Promise<void> {
      const container = containerRef.current
      if (!container) {
        return
      }

      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ])

      if (disposed) {
        return
      }

      const terminal = new XTerm({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Cascadia Code", ui-monospace, monospace',
        theme: XTERM_THEME,
        convertEol: true,
      })
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.open(container)

      if (historyAnsi) {
        terminal.write(historyAnsi)
      }

      const syncSize = () => {
        fitAddon.fit()
        void resizePty({
          data: {
            sessionId,
            cols: terminal.cols,
            rows: terminal.rows,
          },
        })
      }

      syncSize()

      const observer = new ResizeObserver(syncSize)
      observer.observe(container)
      cleanupResize = () => observer.disconnect()

      if (!connectLive) {
        handleConnectionStatusChange('idle')
        closeStream = () => terminal.dispose()
        return
      }

      handleConnectionStatusChange('connecting')
      const eventSource = new EventSource(`/api/stream/${sessionId}`)

      eventSource.onopen = () => {
        handleConnectionStatusChange('live')
      }

      eventSource.onmessage = (message) => {
        const event = JSON.parse(message.data) as StreamEventEnvelope
        if (event.type === 'output') {
          terminal.write(event.payload.chunk)
        }
        handleEvent(event)
      }

      eventSource.onerror = () => {
        eventSource.close()
        handleConnectionStatusChange('disconnected')
      }

      closeStream = () => {
        eventSource.close()
        terminal.dispose()
      }
    }

    void setup()

    return () => {
      disposed = true
      cleanupResize()
      closeStream()
    }
  }, [
    connectLive,
    sessionId,
  ])

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[28rem] overflow-hidden rounded-t-[2rem] bg-[#0d1117]"
    />
  )
}
