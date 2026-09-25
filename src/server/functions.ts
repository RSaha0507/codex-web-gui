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
import type {
  HomeData,
  SessionPageData,
  SettingsPageData,
} from '#/lib/types'
import {
  assertDirectoryExists,
  discoverWorkspaceRules,
  ensurePathInsideSession,
  readFilePreview,
  sanitizeWorkingDirectory,
  saveDirectFileContent,
} from './files'
import { getCodexHealth } from './health'
import {
  addFileChange,
  addSystemMessage,
  addUserMessage,
  createSessionRecord,
  deleteGuardrailRule,
  deleteInstructionPreset,
  getDbInfo,
  getFileChanges,
  getLatestFileChange,
  getLatestTestRun,
  getSessionById,
  getSessionCheckpoints,
  getSessionHistoryAnsi,
  getSessionMessages,
  hasUserMessages,
  listGuardrailRules,
  listInstructionPresets,
  listSessions,
  listWorkspaces,
  removeWorkspace,
  rollbackToCheckpoint,
  saveGuardrailRule,
  saveInstructionPreset,
  toggleGuardrailRule,
  touchWorkspace,
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
import {
  applyAcceptedHunksToContent,
  calculateSessionTokenMetrics,
  computeUnifiedDiff,
  parseUnifiedDiff,
} from './diff'
import { executeTestRunner } from './testRunner'

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

async function buildHomeData(): Promise<HomeData> {
  const settings = readAppSettings()
  return {
    sessions: listSessions(),
    settings,
    codexHealth: getCodexHealth(),
    dbInfo: getDbInfo(),
    workspaces: listWorkspaces(),
    presets: listInstructionPresets(),
    guardrailRules: listGuardrailRules(),
  }
}

async function buildSessionPageData(sessionId: string): Promise<SessionPageData> {
  const session = requireSession(sessionId)
  const messages = getSessionMessages(sessionId)
  const fileChanges = getFileChanges(sessionId)
  const historyAnsi = getSessionHistoryAnsi(sessionId)
  const settings = readAppSettings()

  // Discovered rules from active directory
  const discoveredRules = await discoverWorkspaceRules(session.cwd)

  // Calculate Token & Cost Metrics
  const userPrompts = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n')
  const assistantOutput = messages
    .filter((m) => m.role === 'assistant')
    .map((m) => m.content)
    .join('\n')

  const tokenMetrics = calculateSessionTokenMetrics(
    session.model,
    userPrompts,
    assistantOutput || historyAnsi,
    session.systemPrompt,
  )

  const checkpoints = getSessionCheckpoints(sessionId)
  const latestTestRun = getLatestTestRun(sessionId)

  return {
    session,
    sessions: listSessions(),
    messages,
    fileChanges,
    historyAnsi,
    dbInfo: getDbInfo(),
    codexHealth: getCodexHealth(),
    isLive: isSessionLive(sessionId),
    checkpoints,
    workspaces: listWorkspaces(),
    presets: listInstructionPresets(),
    guardrailRules: listGuardrailRules(),
    discoveredRules,
    tokenMetrics,
    latestTestRun,
    settings,
  }
}

function buildSettingsPageData(): SettingsPageData {
  return {
    settings: readAppSettings(),
    dbInfo: getDbInfo(),
    codexHealth: getCodexHealth(),
    guardrailRules: listGuardrailRules(),
    presets: listInstructionPresets(),
    workspaces: listWorkspaces(),
  }
}

export const getHomeData = createServerFn({ method: 'GET' }).handler(
  async () => buildHomeData(),
)

export const getSessionPageData = createServerFn({ method: 'GET' })
  .validator(sessionIdInputSchema)
  .handler(async ({ data }) => buildSessionPageData(data.sessionId))

export const listSessionsFn = createServerFn({ method: 'GET' }).handler(
  async () => listSessions(),
)

export const createSession = createServerFn({ method: 'POST' })
  .validator(newSessionSchema)
  .handler(async ({ data }) => {
    const cwd = sanitizeWorkingDirectory(data.cwd)
    await assertDirectoryExists(cwd)

    const session = createSessionRecord({
      cwd,
      model: data.model,
      approvalMode: data.approvalMode,
      systemPrompt: data.systemPrompt || '',
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
  .validator(promptInputSchema)
  .handler(async ({ data }) => {
    const session = requireSession(data.sessionId)
    const hasMessages = hasUserMessages(data.sessionId)
    let prompt = data.text

    // If attached context files are provided, format them into prompt
    if (data.attachedFiles && data.attachedFiles.length > 0) {
      const fileContextParts: string[] = []
      for (const file of data.attachedFiles) {
        try {
          const preview = await readFilePreview(session.cwd, file.path)
          fileContextParts.push(
            `\n--- File: ${file.path} ---\n${preview.content}\n--- End File ---`,
          )
        } catch {
          // skip missing files
        }
      }

      if (fileContextParts.length > 0) {
        prompt = `[Attached Context Files]\n${fileContextParts.join('\n')}\n\n[User Instructions]\n${data.text}`
      }
    }

    if (!hasMessages && session.systemPrompt) {
      addSystemMessage(data.sessionId, session.systemPrompt)
      prompt = `System instructions:\n${session.systemPrompt}\n\n${prompt}`
    }

    addUserMessage(data.sessionId, data.text)
    writePromptToSession(data.sessionId, prompt)

    return {
      ok: true,
    }
  })

export const approveEdit = createServerFn({ method: 'POST' })
  .validator(sessionActionSchema)
  .handler(async ({ data }) => {
    writeApprovalToSession(data.sessionId, 'y')
    return {
      ok: true,
    }
  })

export const rejectEdit = createServerFn({ method: 'POST' })
  .validator(sessionActionSchema)
  .handler(async ({ data }) => {
    writeApprovalToSession(data.sessionId, 'n')
    return {
      ok: true,
    }
  })

export const endSession = createServerFn({ method: 'POST' })
  .validator(sessionActionSchema)
  .handler(async ({ data }) => {
    await endSessionRuntime(data.sessionId)
    return {
      ok: true,
    }
  })

export const resizePty = createServerFn({ method: 'POST' })
  .validator(resizePtySchema)
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
  .validator(saveSettingsSchema)
  .handler(async ({ data }) => {
    const settings = saveAppSettings(data)
    return {
      settings,
      dbInfo: getDbInfo(),
      codexHealth: getCodexHealth(),
    }
  })

export const interruptSession = createServerFn({ method: 'POST' })
  .validator(sessionActionSchema)
  .handler(async ({ data }) => {
    interruptSessionRuntime(data.sessionId)
    return {
      ok: true,
    }
  })

// ==========================================
// Feature 1: Direct File Edit & Hunk Acceptance
// ==========================================

const directFileEditSchema = z.object({
  sessionId: sessionIdSchema,
  filePath: z.string().min(1),
  content: z.string(),
})

export const saveDirectFileEdit = createServerFn({ method: 'POST' })
  .validator(directFileEditSchema)
  .handler(async ({ data }) => {
    const session = requireSession(data.sessionId)
    let snapshotBefore: string | null = null
    try {
      const preview = await readFilePreview(session.cwd, data.filePath)
      snapshotBefore = preview.content
    } catch {
      snapshotBefore = null
    }

    await saveDirectFileContent(session.cwd, data.filePath, data.content)

    const diff = computeUnifiedDiff(data.filePath, snapshotBefore, data.content)
    const fileChange = addFileChange({
      sessionId: session.id,
      filePath: data.filePath,
      changeType: snapshotBefore === null ? 'created' : 'modified',
      diff,
      snapshotBefore,
      snapshotAfter: data.content,
    })

    return {
      ok: true,
      fileChange,
    }
  })

const applyHunksSchema = z.object({
  sessionId: sessionIdSchema,
  filePath: z.string().min(1),
  acceptedHunkIds: z.array(z.string()),
  diffText: z.string(),
})

export const applyAcceptedHunks = createServerFn({ method: 'POST' })
  .validator(applyHunksSchema)
  .handler(async ({ data }) => {
    const session = requireSession(data.sessionId)
    const preview = await readFilePreview(session.cwd, data.filePath)
    const parsedFiles = parseUnifiedDiff(data.diffText)
    const targetFile: ParsedFileDiff | undefined =
      parsedFiles.find((f) => f.filePath === data.filePath) ?? parsedFiles[0]

    if (!targetFile || targetFile.hunks.length === 0) {
      throw new Error('No valid hunks found to apply.')
    }

    const acceptedSet = new Set(data.acceptedHunkIds)
    const newContent = applyAcceptedHunksToContent(
      preview.content,
      targetFile.hunks,
      acceptedSet,
    )

    await saveDirectFileContent(session.cwd, data.filePath, newContent)

    const diff = computeUnifiedDiff(data.filePath, preview.content, newContent)
    const fileChange = addFileChange({
      sessionId: session.id,
      filePath: data.filePath,
      changeType: 'modified',
      diff,
      snapshotBefore: preview.content,
      snapshotAfter: newContent,
    })

    return {
      ok: true,
      fileChange,
    }
  })

// ==========================================
// Feature 3: Checkpoint Rollback
// ==========================================

const rollbackSchema = z.object({
  sessionId: sessionIdSchema,
  checkpointTimestamp: z.number().int(),
})

export const rollbackToCheckpointAction = createServerFn({ method: 'POST' })
  .validator(rollbackSchema)
  .handler(async ({ data }) => {
    const result = await rollbackToCheckpoint(
      data.sessionId,
      data.checkpointTimestamp,
    )
    return {
      ok: true,
      revertedFilesCount: result.revertedFilesCount,
    }
  })

// ==========================================
// Feature 4: Test Verification Runner & Guardrails
// ==========================================

const runTestSchema = z.object({
  sessionId: sessionIdSchema,
  command: z.string().optional(),
})

export const runProjectTests = createServerFn({ method: 'POST' })
  .validator(runTestSchema)
  .handler(async ({ data }) => {
    const session = requireSession(data.sessionId)
    const settings = readAppSettings()
    const testCommand = data.command || settings.testCommand || 'npm test'

    const result = await executeTestRunner(
      session.id,
      session.cwd,
      testCommand,
    )

    return result
  })

const guardrailRuleInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  pattern: z.string().min(1),
  action: z.enum(['auto_approve', 'require_approval', 'block']),
  enabled: z.boolean().optional(),
})

export const saveGuardrailRuleAction = createServerFn({ method: 'POST' })
  .validator(guardrailRuleInputSchema)
  .handler(async ({ data }) => {
    const rule = saveGuardrailRule(data)
    return { rule }
  })

export const toggleGuardrailRuleAction = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string(),
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const rule = toggleGuardrailRule(data.id, data.enabled)
    return { rule }
  })

export const deleteGuardrailRuleAction = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    deleteGuardrailRule(data.id)
    return { ok: true }
  })

// ==========================================
// Instruction Presets Management
// ==========================================

const presetInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  systemPrompt: z.string().min(1),
  category: z.enum(['persona', 'guideline', 'testing', 'security', 'custom']),
  tags: z.array(z.string()).optional(),
})

export const savePresetAction = createServerFn({ method: 'POST' })
  .validator(presetInputSchema)
  .handler(async ({ data }) => {
    const preset = saveInstructionPreset(data)
    return { preset }
  })

export const deletePresetAction = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    deleteInstructionPreset(data.id)
    return { ok: true }
  })

// ==========================================
// Workspace Management
// ==========================================

const workspaceInputSchema = z.object({
  path: z.string().min(1),
  name: z.string().optional(),
})

export const addWorkspaceAction = createServerFn({ method: 'POST' })
  .validator(workspaceInputSchema)
  .handler(async ({ data }) => {
    const cwd = sanitizeWorkingDirectory(data.path)
    await assertDirectoryExists(cwd)
    const workspace = touchWorkspace(cwd, data.name)
    return { workspace }
  })

export const removeWorkspaceAction = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    removeWorkspace(data.id)
    return { ok: true }
  })
