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
])
export type StreamEventType = z.infer<typeof streamEventTypeSchema>

export const sessionIdSchema = z.uuid()

export const newSessionSchema = z.object({
  cwd: z.string().trim().min(1, 'Working directory is required'),
  model: z.string().trim().default('gpt-5-codex'),
  approvalMode: approvalModeSchema.default('suggest'),
  systemPrompt: z.string().trim().max(10_000).optional().default(''),
})
export type NewSessionInput = z.infer<typeof newSessionSchema>

export const promptInputSchema = z.object({
  sessionId: sessionIdSchema,
  text: z.string().trim().min(1, 'Prompt cannot be empty'),
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

export interface HomeData {
  sessions: SessionRecord[]
  settings: AppSettings
  codexHealth: CodexHealth
  dbInfo: DbInfo
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
}

export interface SettingsPageData {
  settings: AppSettings
  dbInfo: DbInfo
  codexHealth: CodexHealth
}

export function isUuid(value: string): boolean {
  return sessionIdSchema.safeParse(value).success
}
