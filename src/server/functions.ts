import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  newSessionSchema,
  promptInputSchema,
  resizePtySchema,
  saveSettingsSchema,
  sessionActionSchema,
  sessionIdSchema,
} from '#/lib/types'
import type { HomeData, SessionPageData, SettingsPageData } from '#/lib/types'
import { assertDirectoryExists, sanitizeWorkingDirectory } from './files'
import { getCodexHealth } from './health'
import {
  addSystemMessage,
  addUserMessage,
  createSessionRecord,
  getDbInfo,
  getFileChanges,
  getSessionById,
  getSessionHistoryAnsi,
  getSessionMessages,
  hasUserMessages,
  listSessions,
} from './sessions'
import {
  endSessionRuntime,
  interruptSessionRuntime,
  isSessionLive,
  resizeSessionPty,
  spawnSessionRuntime,
  writeApprovalToSession,
  writePromptToSession,
} from './pty'
import { readAppSettings, saveAppSettings } from './settings'

const sessionIdInputSchema = z.object({
  sessionId: sessionIdSchema,
})

function requireSession(sessionId: string) {
  const session = getSessionById(sessionId)
  if (!session) {
    throw new Error('Session not found.')
  }

  return session
}

function buildHomeData(): HomeData {
  return {
    sessions: listSessions(),
    settings: readAppSettings(),
    codexHealth: getCodexHealth(),
    dbInfo: getDbInfo(),
  }
}

function buildSessionPageData(sessionId: string): SessionPageData {
  const session = requireSession(sessionId)

  return {
    session,
    sessions: listSessions(),
    messages: getSessionMessages(sessionId),
    fileChanges: getFileChanges(sessionId),
    historyAnsi: getSessionHistoryAnsi(sessionId),
    dbInfo: getDbInfo(),
    codexHealth: getCodexHealth(),
    isLive: isSessionLive(sessionId),
  }
}

function buildSettingsPageData(): SettingsPageData {
  return {
    settings: readAppSettings(),
    dbInfo: getDbInfo(),
    codexHealth: getCodexHealth(),
  }
}

export const getHomeData = createServerFn({ method: 'GET' }).handler(
  async () => buildHomeData(),
)

export const getSessionPageData = createServerFn({ method: 'GET' })
  .inputValidator(sessionIdInputSchema)
  .handler(async ({ data }) => buildSessionPageData(data.sessionId))

export const listSessionsFn = createServerFn({ method: 'GET' }).handler(
  async () => listSessions(),
)

export const createSession = createServerFn({ method: 'POST' })
  .inputValidator(newSessionSchema)
  .handler(async ({ data }) => {
    const cwd = sanitizeWorkingDirectory(data.cwd)
    await assertDirectoryExists(cwd)

    const session = createSessionRecord({
      cwd,
      model: data.model,
      approvalMode: data.approvalMode,
      systemPrompt: data.systemPrompt,
    })

    try {
      await spawnSessionRuntime(session)
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to launch the Codex CLI session.',
      )
    }

    return {
      sessionId: session.id,
    }
  })

export const sendPrompt = createServerFn({ method: 'POST' })
  .inputValidator(promptInputSchema)
  .handler(async ({ data }) => {
    const session = requireSession(data.sessionId)
    const hasMessages = hasUserMessages(data.sessionId)
    let prompt = data.text

    if (!hasMessages && session.systemPrompt) {
      addSystemMessage(data.sessionId, session.systemPrompt)
      prompt = `System instructions:\n${session.systemPrompt}\n\nUser request:\n${data.text}`
    }

    addUserMessage(data.sessionId, data.text)
    writePromptToSession(data.sessionId, prompt)

    return {
      ok: true,
    }
  })

export const approveEdit = createServerFn({ method: 'POST' })
  .inputValidator(sessionActionSchema)
  .handler(async ({ data }) => {
    writeApprovalToSession(data.sessionId, 'y')
    return {
      ok: true,
    }
  })

export const rejectEdit = createServerFn({ method: 'POST' })
  .inputValidator(sessionActionSchema)
  .handler(async ({ data }) => {
    writeApprovalToSession(data.sessionId, 'n')
    return {
      ok: true,
    }
  })

export const endSession = createServerFn({ method: 'POST' })
  .inputValidator(sessionActionSchema)
  .handler(async ({ data }) => {
    await endSessionRuntime(data.sessionId)
    return {
      ok: true,
    }
  })

export const resizePty = createServerFn({ method: 'POST' })
  .inputValidator(resizePtySchema)
  .handler(async ({ data }) => {
    resizeSessionPty(data.sessionId, data.cols, data.rows)
    return {
      ok: true,
    }
  })

export const getSettingsData = createServerFn({ method: 'GET' }).handler(
  async () => buildSettingsPageData(),
)

export const saveSettings = createServerFn({ method: 'POST' })
  .inputValidator(saveSettingsSchema)
  .handler(async ({ data }) => {
    const settings = saveAppSettings(data)
    return {
      settings,
      dbInfo: getDbInfo(),
      codexHealth: getCodexHealth(),
    }
  })

export const interruptSession = createServerFn({ method: 'POST' })
  .inputValidator(sessionActionSchema)
  .handler(async ({ data }) => {
    interruptSessionRuntime(data.sessionId)
    return {
      ok: true,
    }
  })
