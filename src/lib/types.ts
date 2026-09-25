import { z } from 'zod'

export const approvalModeSchema = z.enum([
  'suggest',
  'auto-edit',
  'full-auto',
])
export type ApprovalMode = z.infer<typeof approvalModeSchema>

export const sessionStatusSchema = z.enum(['active', 'ended', 'error'])
export type SessionStatus = z.infer<typeof sessionStatusSchema>

export const messageRoleSchema = z.enum(['user', 'assistant', 'system'])
export type MessageRole = z.infer<typeof messageRoleSchema>

export const fileChangeTypeSchema = z.enum(['created', 'modified', 'deleted'])
export type FileChangeType = z.infer<typeof fileChangeTypeSchema>

export const streamEventTypeSchema = z.enum([
  'output',
  'file_change',
  'approval_request',
  'session_end',
  'error',
  'test_run',
  'checkpoint',
])
export type StreamEventType = z.infer<typeof streamEventTypeSchema>

export const sessionIdSchema = z.string().uuid()

export const newSessionSchema = z.object({
  cwd: z.string().trim().min(1, 'Working directory is required'),
  model: z.string().trim().default('gpt-5-codex'),
  approvalMode: approvalModeSchema.default('suggest'),
  systemPrompt: z.string().trim().max(50_000).optional().default(''),
  presetId: z.string().optional(),
})
export type NewSessionInput = z.infer<typeof newSessionSchema>

export const promptInputSchema = z.object({
  sessionId: sessionIdSchema,
  text: z.string().trim().min(1, 'Prompt cannot be empty'),
  attachedFiles: z
    .array(
      z.object({
        path: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
})
export type PromptInput = z.infer<typeof promptInputSchema>

export const sessionActionSchema = z.object({
  sessionId: sessionIdSchema,
})
export type SessionActionInput = z.infer<typeof sessionActionSchema>

export const resizePtySchema = z.object({
  sessionId: sessionIdSchema,
  cols: z.number().int().min(20).max(600),
  rows: z.number().int().min(10).max(300),
})
export type ResizePtyInput = z.infer<typeof resizePtySchema>

export const saveSettingsSchema = z.object({
  openAiApiKey: z.string().trim().optional().default(''),
  defaultModel: z.string().trim().default('gpt-5-codex'),
  defaultApprovalMode: approvalModeSchema.default('suggest'),
  defaultCwd: z.string().trim().min(1),
  dataDir: z.string().trim().min(1),
  host: z.string().trim().min(1).default('127.0.0.1'),
  port: z.string().trim().regex(/^\d+$/).default('3000'),
  autoRunTestsOnDiff: z.boolean().default(false),
  testCommand: z.string().trim().default('npm test'),
})
export type SaveSettingsInput = z.infer<typeof saveSettingsSchema>

export type ThemeMode = 'light' | 'dark'

export interface AppSettings {
  openAiApiKey: string
  defaultModel: string
  defaultApprovalMode: ApprovalMode
  defaultCwd: string
  dataDir: string
  dbFile: string
  host: string
  port: string
  autoRunTestsOnDiff?: boolean
  testCommand?: string
}

export interface CodexHealth {
  available: boolean
  version: string | null
  command: string
  message: string | null
}

export interface DbInfo {
  path: string
  isInMemoryFallback: boolean
  warning: string | null
}

export interface SessionRecord {
  id: string
  title: string
  cwd: string
  model: string
  approvalMode: ApprovalMode
  status: SessionStatus
  systemPrompt: string
  createdAt: number
  updatedAt: number
}

export interface MessageRecord {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  rawAnsi: string | null
  createdAt: number
}

export interface FileChangeRecord {
  id: string
  sessionId: string
  filePath: string
  changeType: FileChangeType
  diff: string | null
  snapshotBefore: string | null
  snapshotAfter: string | null
  createdAt: number
}

export interface ApprovalRequestPayload {
  description: string
  filePath: string | null
  diff: string | null
  matchedRule?: {
    id: string
    name: string
    action: 'auto_approve' | 'require_approval' | 'block'
  } | null
}

export interface SessionEndPayload {
  exitCode: number
}

export interface ErrorPayload {
  message: string
}

export interface OutputPayload {
  chunk: string
}

export interface FileChangePayload {
  path: string
  changeType: FileChangeType
  diff: string | null
  before: string | null
  after: string | null
}

export type OutputEventEnvelope = {
  type: 'output'
  sessionId: string
  payload: OutputPayload
  timestamp: number
}

export type FileChangeEventEnvelope = {
  type: 'file_change'
  sessionId: string
  payload: FileChangePayload
  timestamp: number
}

export type ApprovalRequestEventEnvelope = {
  type: 'approval_request'
  sessionId: string
  payload: ApprovalRequestPayload
  timestamp: number
}

export type SessionEndEventEnvelope = {
  type: 'session_end'
  sessionId: string
  payload: SessionEndPayload
  timestamp: number
}

export type ErrorEventEnvelope = {
  type: 'error'
  sessionId: string
  payload: ErrorPayload
  timestamp: number
}

export type StreamEventEnvelope =
  | OutputEventEnvelope
  | FileChangeEventEnvelope
  | ApprovalRequestEventEnvelope
  | SessionEndEventEnvelope
  | ErrorEventEnvelope

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

// ---- Feature 1: Granular Hunks & Diff Workbench ----
export interface DiffHunkLine {
  type: 'add' | 'delete' | 'context' | 'header'
  text: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface ParsedDiffHunk {
  id: string
  index: number
  header: string
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
  lines: DiffHunkLine[]
  isAccepted: boolean
  rawText: string
}

export interface ParsedFileDiff {
  filePath: string
  oldPath: string
  newPath: string
  hunks: ParsedDiffHunk[]
  addedCount: number
  deletedCount: number
}

export type DiffViewMode = 'unified' | 'split'

// ---- Feature 2: Context Drawer & Rule Presets ----
export interface PinnedContextFile {
  path: string
  name: string
  previewSnippet?: string
}

export interface InstructionPreset {
  id: string
  name: string
  description: string
  systemPrompt: string
  category: 'persona' | 'guideline' | 'testing' | 'security' | 'custom'
  tags: string[]
  isDefault?: boolean
  createdAt: number
}

export interface DiscoveredRuleFile {
  name: string
  path: string
  relativePath: string
  content: string
  fileType: 'codex' | 'cursorrules' | 'claude' | 'copilot' | 'custom'
}

// ---- Feature 3: Checkpoints & Token/Cost Counter ----
export interface CheckpointRecord {
  id: string
  sessionId: string
  messageId?: string | null
  promptText: string
  affectedFiles: string[]
  fileChangesCount: number
  status: 'active' | 'rolled_back'
  createdAt: number
}

export interface TokenTurnDetail {
  turnIndex: number
  messageId: string
  promptPreview: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  turnCostUsd: number
  timestamp: number
}

export interface ModelPricingComparison {
  modelName: string
  estimatedCostUsd: number
  promptCostPer1M: number
  completionCostPer1M: number
}

export interface TokenMetrics {
  promptTokens: number
  completionTokens: number
  systemTokens: number
  totalTokens: number
  estimatedCostUsd: number
  model: string
  promptCostPer1k: number
  completionCostPer1k: number
  contextLimit: number
  contextUsedPercent: number
  turns: TokenTurnDetail[]
  comparisons: ModelPricingComparison[]
}

// ---- Feature 6: Activity Logs & Audit System ----
export type ActivityLogEventType =
  | 'session_created'
  | 'session_interrupted'
  | 'session_ended'
  | 'prompt_submitted'
  | 'file_diff_staged'
  | 'hunk_accepted'
  | 'hunk_rejected'
  | 'patch_applied'
  | 'direct_file_edited'
  | 'auto_approved_by_rule'
  | 'manual_approved'
  | 'manual_rejected'
  | 'test_run_started'
  | 'test_run_passed'
  | 'test_run_failed'
  | 'checkpoint_created'
  | 'checkpoint_rollback'
  | 'workspace_switched'
  | 'guardrail_updated'
  | 'preset_applied'

export type ActivityActor = 'user' | 'guardrail' | 'codex' | 'system'

export interface ActivityLogRecord {
  id: string
  sessionId: string | null
  eventType: ActivityLogEventType
  summary: string
  details: Record<string, unknown>
  actor: ActivityActor
  createdAt: number
}

// ---- Feature 4: Guardrails & Test Runner ----
export type GuardrailAction = 'auto_approve' | 'require_approval' | 'block'

export interface GuardrailRule {
  id: string
  name: string
  description: string
  pattern: string
  action: GuardrailAction
  enabled: boolean
  isSystem?: boolean
  createdAt: number
}

export interface TestRunResult {
  id: string
  sessionId: string
  command: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  passed: boolean
  createdAt: number
}

// ---- Feature 5: Workspaces / Multi-Project ----
export interface WorkspaceRecord {
  id: string
  path: string
  name: string
  lastOpenedAt: number
  sessionCount: number
  createdAt: number
}

// ---- Page Data Interfaces ----
export interface HomeData {
  sessions: SessionRecord[]
  settings: AppSettings
  codexHealth: CodexHealth
  dbInfo: DbInfo
  workspaces: WorkspaceRecord[]
  presets: InstructionPreset[]
  guardrailRules: GuardrailRule[]
  activityLogs: ActivityLogRecord[]
}

export interface SessionPageData {
  session: SessionRecord
  sessions: SessionRecord[]
  messages: MessageRecord[]
  fileChanges: FileChangeRecord[]
  historyAnsi: string
  dbInfo: DbInfo
  codexHealth: CodexHealth
  isLive: boolean
  checkpoints: CheckpointRecord[]
  workspaces: WorkspaceRecord[]
  presets: InstructionPreset[]
  guardrailRules: GuardrailRule[]
  discoveredRules: DiscoveredRuleFile[]
  tokenMetrics: TokenMetrics
  latestTestRun: TestRunResult | null
  activityLogs: ActivityLogRecord[]
  settings: AppSettings
}

export interface SettingsPageData {
  settings: AppSettings
  dbInfo: DbInfo
  codexHealth: CodexHealth
  guardrailRules: GuardrailRule[]
  presets: InstructionPreset[]
  workspaces: WorkspaceRecord[]
}

export function isUuid(value: string): boolean {
  return sessionIdSchema.safeParse(value).success
}
