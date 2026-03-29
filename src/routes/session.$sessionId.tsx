import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import ApprovalBar from '#/components/ApprovalBar'
import DiffViewer from '#/components/DiffViewer'
import FileTree from '#/components/FileTree'
import PromptInput from '#/components/PromptInput'
import SessionList from '#/components/SessionList'
import StatusBar from '#/components/StatusBar'
import Terminal from '#/components/Terminal'
import type {
  ApprovalRequestPayload,
  FileChangeRecord,
  StreamEventEnvelope,
} from '#/lib/types'
import {
  approveEdit,
  endSession,
  getSessionPageData,
  listSessionsFn,
  rejectEdit,
  sendPrompt,
} from '#/server/functions'

export const Route = createFileRoute('/session/$sessionId')({
  loader: async ({ params }) =>
    getSessionPageData({
      data: {
        sessionId: params.sessionId,
      },
    }),
  component: SessionPage,
})

function SessionPage() {
  const navigate = useNavigate()
  const initialData = Route.useLoaderData()
  const [session, setSession] = useState(initialData.session)
  const [sessions, setSessions] = useState(initialData.sessions)
  const [fileChanges, setFileChanges] = useState(initialData.fileChanges)
  const [historyAnsi, setHistoryAnsi] = useState(initialData.historyAnsi)
  const [approvalRequest, setApprovalRequest] =
    useState<ApprovalRequestPayload | null>(null)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [reconnectKey, setReconnectKey] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'live' | 'disconnected'
  >(initialData.isLive ? 'connecting' : 'idle')
  const [processing, setProcessing] = useState(false)
  const busyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSession(initialData.session)
    setSessions(initialData.sessions)
    setFileChanges(initialData.fileChanges)
    setHistoryAnsi(initialData.historyAnsi)
    setApprovalRequest(null)
    setApprovalBusy(false)
    setRefreshNonce(0)
    setReconnectKey((current) => current + 1)
    setConnectionStatus(initialData.isLive ? 'connecting' : 'idle')
    setProcessing(false)
  }, [initialData])

  useEffect(
    () => () => {
      if (busyTimeoutRef.current) {
        clearTimeout(busyTimeoutRef.current)
      }
    },
    [],
  )

  function markProcessing(): void {
    setProcessing(true)
    if (busyTimeoutRef.current) {
      clearTimeout(busyTimeoutRef.current)
    }
    busyTimeoutRef.current = setTimeout(() => {
      setProcessing(false)
    }, 900)
  }

  async function refreshSessionList(): Promise<void> {
    try {
      const nextSessions = await listSessionsFn()
      setSessions(nextSessions)
    } catch {
      // Ignore sidebar refresh failures.
    }
  }

  async function handleSendPrompt(value: string): Promise<void> {
    markProcessing()
    setApprovalRequest(null)
    try {
      await sendPrompt({
        data: {
          sessionId: session.id,
          text: value,
        },
      })
    } catch (error) {
      setProcessing(false)
      throw error
    }
  }

  async function handleInterrupt(): Promise<void> {
    await fetch(`/api/interrupt/${session.id}`, {
      method: 'POST',
    })
    setProcessing(false)
  }

  async function handleApprove(): Promise<void> {
    setApprovalBusy(true)
    try {
      await approveEdit({
        data: {
          sessionId: session.id,
        },
      })
      setApprovalRequest(null)
    } finally {
      setApprovalBusy(false)
    }
  }

  async function handleReject(): Promise<void> {
    setApprovalBusy(true)
    try {
      await rejectEdit({
        data: {
          sessionId: session.id,
        },
      })
      setApprovalRequest(null)
    } finally {
      setApprovalBusy(false)
    }
  }

  async function handleEndSession(): Promise<void> {
    await endSession({
      data: {
        sessionId: session.id,
      },
    })
    setSession((current) => ({
      ...current,
      status: 'ended',
    }))
    setConnectionStatus('idle')
    setProcessing(false)
    await refreshSessionList()
  }

  function handleStreamEvent(event: StreamEventEnvelope): void {
    switch (event.type) {
      case 'output':
        setHistoryAnsi((current) => current + event.payload.chunk)
        markProcessing()
        return
      case 'file_change': {
        const nextFileChange: FileChangeRecord = {
          id: `${event.timestamp}-${event.payload.path}`,
          sessionId: event.sessionId,
          filePath: event.payload.path,
          changeType: event.payload.changeType,
          diff: event.payload.diff,
          snapshotBefore: event.payload.before,
          snapshotAfter: event.payload.after,
          createdAt: event.timestamp,
        }

        setFileChanges((current) => [nextFileChange, ...current])
        setRefreshNonce((current) => current + 1)
        return
      }
      case 'approval_request':
        setApprovalRequest(event.payload)
        setProcessing(true)
        return
      case 'session_end':
        setProcessing(false)
        setApprovalRequest(null)
        setConnectionStatus('idle')
        setSession((current) => ({
          ...current,
          status: event.payload.exitCode === 0 ? 'ended' : 'error',
        }))
        void refreshSessionList()
        return
      case 'error':
        setProcessing(false)
        return
    }
  }

  const modifiedPaths = new Set(fileChanges.map((change) => change.filePath))
  const promptDisabled = processing || session.status !== 'active'

  return (
    <main className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[240px_minmax(0,1fr)_360px]">
      <aside className="flex min-h-0 flex-col gap-4">
        <section className="rounded-[2rem] border border-white/10 bg-[rgba(7,11,16,0.82)] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Sessions
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Resume a previous run or keep the current one pinned.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void navigate({ to: '/' })}
              className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10"
            >
              New
            </button>
          </div>
          <SessionList sessions={sessions} activeSessionId={session.id} />
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(7,11,16,0.82)]">
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              File Tree
            </p>
            <p className="mt-1 text-sm text-slate-300">{session.cwd}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <FileTree
              sessionId={session.id}
              refreshNonce={refreshNonce}
              modifiedPaths={modifiedPaths}
            />
          </div>
        </section>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-[2.2rem] border border-white/10 bg-[rgba(7,11,16,0.88)] shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Active Session
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              {session.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{session.cwd}</p>
          </div>
          <div className="flex items-center gap-2">
            {session.status === 'active' &&
            connectionStatus === 'disconnected' ? (
              <button
                type="button"
                onClick={() => {
                  setConnectionStatus('connecting')
                  setReconnectKey((current) => current + 1)
                }}
                className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-400/20"
              >
                Reconnect
              </button>
            ) : null}
            {session.status === 'active' ? (
              <button
                type="button"
                onClick={() => void handleEndSession()}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
              >
                End Session
              </button>
            ) : null}
          </div>
        </div>

        {connectionStatus === 'disconnected' ? (
          <div className="border-b border-amber-400/20 bg-amber-400/10 px-5 py-3 text-sm text-amber-200">
            The live stream dropped unexpectedly. Reconnect to resume output
            streaming.
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden px-4 pt-4">
          <Terminal
            key={`${session.id}-${reconnectKey}`}
            sessionId={session.id}
            historyAnsi={historyAnsi}
            connectLive={session.status === 'active'}
            onEvent={handleStreamEvent}
            onConnectionStatusChange={setConnectionStatus}
          />
        </div>

        <ApprovalBar
          request={approvalRequest}
          busy={approvalBusy}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        <PromptInput
          disabled={promptDisabled}
          onSubmit={handleSendPrompt}
          onInterrupt={handleInterrupt}
        />

        <StatusBar
          session={session}
          connectionStatus={connectionStatus}
          fileChangeCount={fileChanges.length}
        />
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(7,11,16,0.82)]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Diff Viewer
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Reverse-chronological file changes from this session.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <DiffViewer fileChanges={fileChanges} />
        </div>
      </aside>
    </main>
  )
}
