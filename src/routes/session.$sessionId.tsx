import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  BarChart3,
  Coins,
  Columns,
  FlaskConical,
  GitBranch,
  History,
  Layers,
  Sparkles,
} from 'lucide-react'
import ActivityLogsViewer from '#/components/ActivityLogsViewer'
import ApprovalBar from '#/components/ApprovalBar'
import ContextDrawer from '#/components/ContextDrawer'
import DiffViewer from '#/components/DiffViewer'
import FileTree from '#/components/FileTree'
import PromptInput from '#/components/PromptInput'
import SessionList from '#/components/SessionList'
import StatusBar from '#/components/StatusBar'
import Terminal from '#/components/Terminal'
import TestRunnerModal from '#/components/TestRunnerModal'
import TimelineReplay from '#/components/TimelineReplay'
import TokenCostBadge from '#/components/TokenCostBadge'
import WorkspaceSwitcher from '#/components/WorkspaceSwitcher'
import type {
  ActivityLogRecord,
  ApprovalRequestPayload,
  DiscoveredRuleFile,
  FileChangeRecord,
  InstructionPreset,
  PinnedContextFile,
  StreamEventEnvelope,
} from '#/lib/types'
import {
  approveEdit,
  clearActivityLogsFn,
  createSession,
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
  const [checkpoints, setCheckpoints] = useState(initialData.checkpoints)
  const [tokenMetrics, setTokenMetrics] = useState(initialData.tokenMetrics)
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>(
    initialData.activityLogs || [],
  )
  const [pinnedFiles, setPinnedFiles] = useState<PinnedContextFile[]>([])
  const [approvalRequest, setApprovalRequest] =
    useState<ApprovalRequestPayload | null>(null)
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [reconnectKey, setReconnectKey] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'live' | 'disconnected'
  >(initialData.isLive ? 'connecting' : 'idle')
  const [processing, setProcessing] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'diffs' | 'timeline' | 'logs'>('diffs')
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const busyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSession(initialData.session)
    setSessions(initialData.sessions)
    setFileChanges(initialData.fileChanges)
    setHistoryAnsi(initialData.historyAnsi)
    setCheckpoints(initialData.checkpoints)
    setTokenMetrics(initialData.tokenMetrics)
    setActivityLogs(initialData.activityLogs || [])
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

  async function reloadPageData(): Promise<void> {
    try {
      const nextData = await getSessionPageData({
        data: { sessionId: session.id },
      })
      setFileChanges(nextData.fileChanges)
      setCheckpoints(nextData.checkpoints)
      setTokenMetrics(nextData.tokenMetrics)
      setActivityLogs(nextData.activityLogs || [])
      setRefreshNonce((n) => n + 1)
    } catch {
      // ignore reload errors
    }
  }

  async function handleClearActivityLogs(): Promise<void> {
    try {
      await clearActivityLogsFn({ data: { sessionId: session.id } })
      setActivityLogs([])
    } catch {
      // ignore clear errors
    }
  }

  async function handleSendPrompt(
    value: string,
    attachedFiles?: PinnedContextFile[],
  ): Promise<void> {
    markProcessing()
    setApprovalRequest(null)
    try {
      await sendPrompt({
        data: {
          sessionId: session.id,
          text: value,
          attachedFiles,
        },
      })
      void reloadPageData()
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
        void reloadPageData()
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
        void reloadPageData()
        return
      case 'error':
        setProcessing(false)
        return
    }
  }

  function handleAddPinnedFile(file: PinnedContextFile): void {
    setPinnedFiles((prev) => {
      if (prev.some((f) => f.path === file.path)) return prev
      return [...prev, file]
    })
  }

  function handleRemovePinnedFile(path: string): void {
    setPinnedFiles((prev) => prev.filter((f) => f.path !== path))
  }

  function handleApplyPreset(preset: InstructionPreset | DiscoveredRuleFile): void {
    const text =
      'systemPrompt' in preset ? preset.systemPrompt : preset.content
    void handleSendPrompt(`[Applying Instruction Rule: ${preset.name}]\n${text}`)
  }

  async function handleSwitchWorkspace(newCwd: string): Promise<void> {
    if (newCwd === session.cwd) return
    const res = await createSession({
      data: {
        cwd: newCwd,
        model: session.model,
        approvalMode: session.approvalMode,
      },
    })
    await navigate({
      to: '/session/$sessionId',
      params: { sessionId: res.sessionId },
    })
  }

  const modifiedPaths = new Set(fileChanges.map((change) => change.filePath))
  const pinnedPaths = new Set(pinnedFiles.map((f) => f.path))
  const promptDisabled = processing || session.status !== 'active'

  return (
    <main className="grid min-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[250px_minmax(0,1fr)_420px]">
      {/* Left Sidebar: Sessions & File Tree */}
      <aside className="flex min-h-0 flex-col gap-4">
        {/* Sessions list card */}
        <section className="rounded-[2rem] border border-white/10 bg-[rgba(7,11,16,0.85)] p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Sessions
              </p>
              <p className="text-xs text-slate-400">History & runs</p>
            </div>
            <button
              type="button"
              onClick={() => void navigate({ to: '/' })}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
            >
              + New
            </button>
          </div>
          <SessionList sessions={sessions} activeSessionId={session.id} />
        </section>

        {/* File Tree with Quick Context Pinning */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(7,11,16,0.85)] shadow-lg">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                File Tree
              </p>
              <span className="text-[10px] text-cyan-300">Click + to Pin</span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
              {session.cwd}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <FileTree
              sessionId={session.id}
              refreshNonce={refreshNonce}
              modifiedPaths={modifiedPaths}
              onPinFile={handleAddPinnedFile}
              pinnedPaths={pinnedPaths}
            />
          </div>
        </section>
      </aside>

      {/* Main Center Area: Active Session Terminal & Prompt Bar */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[2.2rem] border border-white/10 bg-[rgba(7,11,16,0.9)] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
        {/* Session Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 bg-white/2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Multi-Project / Workspace Switcher */}
            <WorkspaceSwitcher
              currentCwd={session.cwd}
              workspaces={initialData.workspaces}
              onSelectWorkspace={(cwd) => void handleSwitchWorkspace(cwd)}
            />

            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-100">
                {session.title}
              </h2>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {/* Token & Cost Counter */}
            <TokenCostBadge metrics={tokenMetrics} sessionId={session.id} />

            {/* Test Suite Trigger */}
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/20"
              title="Run project test suite"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Run Tests</span>
            </button>

            {session.status === 'active' &&
            connectionStatus === 'disconnected' ? (
              <button
                type="button"
                onClick={() => {
                  setConnectionStatus('connecting')
                  setReconnectKey((current) => current + 1)
                }}
                className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200 transition hover:bg-amber-400/20"
              >
                Reconnect
              </button>
            ) : null}

            {session.status === 'active' ? (
              <button
                type="button"
                onClick={() => void handleEndSession()}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
              >
                End Session
              </button>
            ) : null}
          </div>
        </div>

        {connectionStatus === 'disconnected' ? (
          <div className="border-b border-amber-400/20 bg-amber-400/10 px-5 py-2 text-xs text-amber-200">
            The live stream dropped unexpectedly. Reconnect to resume output streaming.
          </div>
        ) : null}

        {/* Terminal Area */}
        <div className="min-h-0 flex-1 overflow-hidden px-4 pt-3">
          <Terminal
            key={`${session.id}-${reconnectKey}`}
            sessionId={session.id}
            historyAnsi={historyAnsi}
            connectLive={session.status === 'active'}
            onEvent={handleStreamEvent}
            onConnectionStatusChange={setConnectionStatus}
          />
        </div>

        {/* Approval Bar with Guardrails & Verification */}
        <ApprovalBar
          request={approvalRequest}
          busy={approvalBusy}
          onApprove={handleApprove}
          onReject={handleReject}
          onOpenTestRunner={() => setIsTestModalOpen(true)}
        />

        {/* Context Drawer & Pinning bar */}
        <ContextDrawer
          pinnedFiles={pinnedFiles}
          onAddPinnedFile={handleAddPinnedFile}
          onRemovePinnedFile={handleRemovePinnedFile}
          discoveredRules={initialData.discoveredRules}
          presets={initialData.presets}
          onApplyPreset={handleApplyPreset}
          sessionId={session.id}
        />

        {/* Prompt Input Area */}
        <PromptInput
          disabled={promptDisabled}
          onSubmit={handleSendPrompt}
          onInterrupt={handleInterrupt}
          pinnedFiles={pinnedFiles}
          onRemovePinnedFile={handleRemovePinnedFile}
        />

        {/* Status Bar */}
        <StatusBar
          session={session}
          connectionStatus={connectionStatus}
          fileChangeCount={fileChanges.length}
          tokenMetrics={tokenMetrics}
          onOpenTestRunner={() => setIsTestModalOpen(true)}
        />
      </section>

      {/* Right Sidebar: Interactive Multi-File Patch Workbench & Timeline Replay */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(7,11,16,0.85)] shadow-xl">
        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 bg-white/2 px-3 py-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSidebarTab('diffs')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              sidebarTab === 'diffs'
                ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Diffs ({fileChanges.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('timeline')}
            className={`ml-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              sidebarTab === 'timeline'
                ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Timeline ({checkpoints.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('logs')}
            className={`ml-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              sidebarTab === 'logs'
                ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Logs ({activityLogs.length})</span>
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {sidebarTab === 'diffs' ? (
            <DiffViewer
              sessionId={session.id}
              fileChanges={fileChanges}
              onFileSaved={() => void reloadPageData()}
            />
          ) : sidebarTab === 'timeline' ? (
            <TimelineReplay
              sessionId={session.id}
              checkpoints={checkpoints}
              onRollbackComplete={() => void reloadPageData()}
            />
          ) : (
            <ActivityLogsViewer
              logs={activityLogs}
              sessionId={session.id}
              onRefresh={() => void reloadPageData()}
              onClearLogs={() => void handleClearActivityLogs()}
            />
          )}
        </div>
      </aside>

      {/* Test Verification Runner Modal */}
      <TestRunnerModal
        sessionId={session.id}
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSendErrorToPrompt={(msg) => void handleSendPrompt(msg)}
        defaultCommand={initialData.settings.testCommand || 'npm test'}
      />
    </main>
  )
}
