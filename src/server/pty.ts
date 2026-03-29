import type { IPty } from 'node-pty'
import { spawn } from 'node-pty'
import {
  DEFAULT_PTY_COLS,
  DEFAULT_PTY_ROWS,
  STREAM_BATCH_MS,
} from '#/lib/constants'
import type {
  FileChangeEventEnvelope,
  FileChangePayload,
  OutputEventEnvelope,
  SessionRecord,
} from '#/lib/types'
import { detectApprovalRequest } from './diff'
import { getCodexLaunchSpec } from './health'
import { createSessionWatcher } from './watcher'
import {
  addAssistantOutput,
  addFileChange,
  getLatestFileChange,
  updateSessionStatus,
} from './sessions'
import { emitSessionEvent } from './stream'
import { readAppSettings } from './settings'

type SessionRuntime = {
  session: SessionRecord
  pty: IPty
  watcherClose: () => Promise<void>
  buffer: string
  flushTimer: ReturnType<typeof setTimeout> | null
  closing: boolean
}

const runtimes = new Map<string, SessionRuntime>()

function getCodexArgs(session: SessionRecord): string[] {
  const args = ['--no-alt-screen', '--cd', session.cwd]

  if (session.model) {
    args.push('--model', session.model)
  }

  switch (session.approvalMode) {
    case 'suggest':
      args.push('--ask-for-approval', 'on-request', '--sandbox', 'workspace-write')
      break
    case 'auto-edit':
      args.push('--ask-for-approval', 'never', '--sandbox', 'workspace-write')
      break
    case 'full-auto':
      args.push('--full-auto')
      break
  }

  return args
}

function emitOutputEvent(sessionId: string, chunk: string): void {
  const event: OutputEventEnvelope = {
    type: 'output',
    sessionId,
    payload: {
      chunk,
    },
    timestamp: Date.now(),
  }
  emitSessionEvent(sessionId, event)
}

function emitFileChangeEvent(
  sessionId: string,
  payload: FileChangePayload,
): void {
  const event: FileChangeEventEnvelope = {
    type: 'file_change',
    sessionId,
    payload,
    timestamp: Date.now(),
  }
  emitSessionEvent(sessionId, event)
}

function flushRuntimeBuffer(runtime: SessionRuntime): void {
  if (!runtime.buffer) {
    return
  }

  const chunk = runtime.buffer
  runtime.buffer = ''
  runtime.flushTimer = null

  addAssistantOutput(runtime.session.id, chunk)
  emitOutputEvent(runtime.session.id, chunk)

  const latestChange = getLatestFileChange(runtime.session.id)
  const approvalRequest = detectApprovalRequest(
    chunk,
    latestChange
      ? {
          filePath: latestChange.filePath,
          diff: latestChange.diff,
        }
      : null,
  )

  if (approvalRequest) {
    emitSessionEvent(runtime.session.id, {
      type: 'approval_request',
      sessionId: runtime.session.id,
      payload: approvalRequest,
      timestamp: Date.now(),
    })
  }
}

function scheduleBufferFlush(runtime: SessionRuntime): void {
  if (runtime.flushTimer) {
    return
  }

  runtime.flushTimer = setTimeout(() => {
    flushRuntimeBuffer(runtime)
  }, STREAM_BATCH_MS)
}

export async function spawnSessionRuntime(
  session: SessionRecord,
): Promise<void> {
  if (runtimes.has(session.id)) {
    return
  }

  const settings = readAppSettings()
  const launch = getCodexLaunchSpec(getCodexArgs(session))
  const watcher = await createSessionWatcher(session.cwd, async (change) => {
    const fileChange = addFileChange({
      sessionId: session.id,
      filePath: change.filePath,
      changeType: change.changeType,
      diff: change.diff,
      snapshotBefore: change.snapshotBefore,
      snapshotAfter: change.snapshotAfter,
    })

    emitFileChangeEvent(session.id, {
      path: fileChange.filePath,
      changeType: fileChange.changeType,
      diff: fileChange.diff,
      before: fileChange.snapshotBefore,
      after: fileChange.snapshotAfter,
    })
  })

  try {
    const pty = spawn(launch.command, launch.args, {
      name: 'xterm-color',
      cols: DEFAULT_PTY_COLS,
      rows: DEFAULT_PTY_ROWS,
      cwd: session.cwd,
      env: {
        ...process.env,
        OPENAI_API_KEY: settings.openAiApiKey,
      },
    })

    const runtime: SessionRuntime = {
      session,
      pty,
      watcherClose: watcher.close,
      buffer: '',
      flushTimer: null,
      closing: false,
    }

    runtimes.set(session.id, runtime)

    pty.onData((chunk) => {
      const active = runtimes.get(session.id)
      if (!active) {
        return
      }

      active.buffer += chunk
      scheduleBufferFlush(active)
    })

    pty.onExit(async ({ exitCode }) => {
      const active = runtimes.get(session.id)
      if (!active) {
        return
      }

      if (active.flushTimer) {
        clearTimeout(active.flushTimer)
      }
      flushRuntimeBuffer(active)

      try {
        await active.watcherClose()
      } catch {
        // Ignore watcher shutdown races.
      }

      runtimes.delete(session.id)
      updateSessionStatus(
        session.id,
        active.closing || exitCode === 0 ? 'ended' : 'error',
      )
      emitSessionEvent(session.id, {
        type: 'session_end',
        sessionId: session.id,
        payload: {
          exitCode,
        },
        timestamp: Date.now(),
      })
    })
  } catch (error) {
    await watcher.close()
    updateSessionStatus(session.id, 'error')
    throw error
  }
}

export function isSessionLive(sessionId: string): boolean {
  return runtimes.has(sessionId)
}

export function writePromptToSession(
  sessionId: string,
  prompt: string,
): void {
  const runtime = runtimes.get(sessionId)
  if (!runtime) {
    throw new Error('The session is not running.')
  }

  runtime.pty.write(`${prompt}\r`)
}

export function writeApprovalToSession(
  sessionId: string,
  decision: 'y' | 'n',
): void {
  const runtime = runtimes.get(sessionId)
  if (!runtime) {
    throw new Error('The session is not running.')
  }

  runtime.pty.write(`${decision}\r`)
}

export function interruptSessionRuntime(sessionId: string): void {
  const runtime = runtimes.get(sessionId)
  if (!runtime) {
    throw new Error('The session is not running.')
  }

  runtime.pty.write('\u0003')
}

export function resizeSessionPty(
  sessionId: string,
  cols: number,
  rows: number,
): void {
  const runtime = runtimes.get(sessionId)
  if (!runtime) {
    return
  }

  runtime.pty.resize(cols, rows)
}

export async function endSessionRuntime(sessionId: string): Promise<void> {
  const runtime = runtimes.get(sessionId)
  if (!runtime) {
    updateSessionStatus(sessionId, 'ended')
    return
  }

  runtime.closing = true
  runtime.pty.kill()
  updateSessionStatus(sessionId, 'ended')
}
