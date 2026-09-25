import crypto from 'node:crypto'
import path from 'node:path'
import Database from 'better-sqlite3'
import type {
  ActivityActor,
  ActivityLogEventType,
  ActivityLogRecord,
  CheckpointRecord,
  DbInfo,
  FileChangeRecord,
  GuardrailRule,
  InstructionPreset,
  MessageRecord,
  SessionRecord,
  TestRunResult,
  WorkspaceRecord,
} from '#/lib/types'
import { stripAnsi, summarizePromptToTitle } from '#/lib/diffUtils'
import { ensureDataDirectory, readAppSettings } from './settings'
import { rollbackFileToSnapshot } from './files'

type DbState = {
  db: Database.Database
  path: string
  warning: string | null
  inMemoryFallback: boolean
}

let state: DbState | null = null

function mapSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    cwd: String(row.cwd),
    model: String(row.model),
    approvalMode: row.approval_mode as SessionRecord['approvalMode'],
    status: row.status as SessionRecord['status'],
    systemPrompt: String(row.system_prompt ?? ''),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }
}

function mapActivityLog(row: Record<string, unknown>): ActivityLogRecord {
  let details: Record<string, unknown> = {}
  try {
    details = JSON.parse(String(row.details || '{}')) as Record<string, unknown>
  } catch {
    details = {}
  }

  return {
    id: String(row.id),
    sessionId: row.session_id ? String(row.session_id) : null,
    eventType: row.event_type as ActivityLogRecord['eventType'],
    summary: String(row.summary),
    details,
    actor: row.actor as ActivityLogRecord['actor'],
    createdAt: Number(row.created_at),
  }
}

function mapMessage(row: Record<string, unknown>): MessageRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    role: row.role as MessageRecord['role'],
    content: String(row.content),
    rawAnsi: row.raw_ansi ? String(row.raw_ansi) : null,
    createdAt: Number(row.created_at),
  }
}

function mapFileChange(row: Record<string, unknown>): FileChangeRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    filePath: String(row.file_path),
    changeType: row.change_type as FileChangeRecord['changeType'],
    diff: row.diff ? String(row.diff) : null,
    snapshotBefore: row.snapshot_before ? String(row.snapshot_before) : null,
    snapshotAfter: row.snapshot_after ? String(row.snapshot_after) : null,
    createdAt: Number(row.created_at),
  }
}

function mapWorkspace(row: Record<string, unknown>): WorkspaceRecord {
  return {
    id: String(row.id),
    path: String(row.path),
    name: String(row.name || path.basename(String(row.path)) || String(row.path)),
    lastOpenedAt: Number(row.last_opened_at || row.created_at),
    sessionCount: Number(row.session_count || 0),
    createdAt: Number(row.created_at),
  }
}

function mapGuardrailRule(row: Record<string, unknown>): GuardrailRule {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    pattern: String(row.pattern),
    action: row.action as GuardrailRule['action'],
    enabled: Boolean(row.enabled),
    isSystem: Boolean(row.is_system),
    createdAt: Number(row.created_at),
  }
}

function mapInstructionPreset(row: Record<string, unknown>): InstructionPreset {
  let tags: string[] = []
  try {
    tags = JSON.parse(String(row.tags || '[]')) as string[]
  } catch {
    tags = []
  }

  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    systemPrompt: String(row.system_prompt ?? ''),
    category: row.category as InstructionPreset['category'],
    tags,
    isDefault: Boolean(row.is_default),
    createdAt: Number(row.created_at),
  }
}

function mapCheckpoint(row: Record<string, unknown>): CheckpointRecord {
  let affectedFiles: string[] = []
  try {
    affectedFiles = JSON.parse(String(row.affected_files || '[]')) as string[]
  } catch {
    affectedFiles = []
  }

  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    messageId: row.message_id ? String(row.message_id) : null,
    promptText: String(row.prompt_text ?? ''),
    affectedFiles,
    fileChangesCount: Number(row.file_changes_count ?? affectedFiles.length),
    status: row.status as CheckpointRecord['status'],
    createdAt: Number(row.created_at),
  }
}

function mapTestRun(row: Record<string, unknown>): TestRunResult {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    command: String(row.command),
    exitCode: Number(row.exit_code),
    stdout: String(row.stdout ?? ''),
    stderr: String(row.stderr ?? ''),
    durationMs: Number(row.duration_ms ?? 0),
    passed: Boolean(row.passed),
    createdAt: Number(row.created_at),
  }
}

function initializeDatabase(db: Database.Database): void {
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      cwd TEXT NOT NULL,
      model TEXT NOT NULL,
      approval_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      system_prompt TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      raw_ansi TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS file_changes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      change_type TEXT NOT NULL,
      diff TEXT,
      snapshot_before TEXT,
      snapshot_after TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      last_opened_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guardrail_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      pattern TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'require_approval',
      enabled INTEGER NOT NULL DEFAULT 1,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS instruction_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      system_prompt TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'guideline',
      tags TEXT NOT NULL DEFAULT '[]',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      message_id TEXT,
      prompt_text TEXT NOT NULL DEFAULT '',
      affected_files TEXT NOT NULL DEFAULT '[]',
      file_changes_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      command TEXT NOT NULL,
      exit_code INTEGER NOT NULL,
      stdout TEXT NOT NULL DEFAULT '',
      stderr TEXT NOT NULL DEFAULT '',
      duration_ms INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      event_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      actor TEXT NOT NULL DEFAULT 'system',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id
      ON messages(session_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_file_changes_session_id
      ON file_changes(session_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_checkpoints_session_id
      ON checkpoints(session_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_test_runs_session_id
      ON test_runs(session_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id
      ON activity_logs(session_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
      ON activity_logs(created_at DESC);
  `)

  // Seed default guardrails if empty
  const ruleCount = (
    db.prepare('SELECT COUNT(*) as count FROM guardrail_rules').get() as {
      count: number
    }
  ).count

  if (ruleCount === 0) {
    const defaultRules = [
      {
        id: 'rule-safe-git',
        name: 'Auto-Approve Safe Git Operations',
        description: 'Auto-approve read-only git status, diff, log, and branch checks',
        pattern: '^git\\s+(status|diff|log|branch|show|rev-parse)',
        action: 'auto_approve',
        enabled: 1,
        isSystem: 1,
      },
      {
        id: 'rule-safe-tests',
        name: 'Auto-Approve Test Executions',
        description: 'Auto-approve test suite triggers (npm test, vitest, jest, pytest)',
        pattern: '(npm\\s+test|vitest|jest|pytest|cargo\\s+test)',
        action: 'auto_approve',
        enabled: 1,
        isSystem: 1,
      },
      {
        id: 'rule-safe-reads',
        name: 'Auto-Approve Read-Only Inquiries',
        description: 'Auto-approve directory listings and cat/head inspections',
        pattern: '^(ls|dir|find|grep|cat|head|tail|pwd|which)\\b',
        action: 'auto_approve',
        enabled: 1,
        isSystem: 1,
      },
      {
        id: 'rule-block-rm',
        name: 'Require Manual Confirmation for Destructive Deletion',
        description: 'Prompt strictly for rm, rimraf, del, or clean operations',
        pattern: '(rm\\s+-rf|rimraf|del\\s+/s|git\\s+clean\\s+-fdx)',
        action: 'require_approval',
        enabled: 1,
        isSystem: 1,
      },
      {
        id: 'rule-protect-env',
        name: 'Protect Secrets & Environment Files',
        description: 'Block or require strict verification before modifying .env or credential files',
        pattern: '(\\.env|credentials|secret|id_rsa|\\.pem)',
        action: 'require_approval',
        enabled: 1,
        isSystem: 1,
      },
      {
        id: 'rule-protect-push',
        name: 'Protect Remote Git Push',
        description: 'Require explicit developer confirmation before pushing commits to remotes',
        pattern: '^git\\s+push',
        action: 'require_approval',
        enabled: 1,
        isSystem: 1,
      },
    ]

    const insertRule = db.prepare(`
      INSERT INTO guardrail_rules (id, name, description, pattern, action, enabled, is_system, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = Date.now()
    for (const rule of defaultRules) {
      insertRule.run(
        rule.id,
        rule.name,
        rule.description,
        rule.pattern,
        rule.action,
        rule.enabled,
        rule.isSystem,
        now,
      )
    }
  }

  // Seed default presets if empty
  const presetCount = (
    db.prepare('SELECT COUNT(*) as count FROM instruction_presets').get() as {
      count: number
    }
  ).count

  if (presetCount === 0) {
    const defaultPresets = [
      {
        id: 'preset-ts-tdd',
        name: 'Strict TypeScript & TDD',
        description:
          'Enforce strict typing, zero any, and write unit tests before/alongside feature logic.',
        systemPrompt:
          'You are a senior software engineer adhering to Test-Driven Development (TDD). Write clean, type-safe TypeScript. Provide unit tests for all new functions, handle edge cases gracefully, and ensure zero compiler or linter errors.',
        category: 'testing',
        tags: JSON.stringify(['TypeScript', 'TDD', 'Unit Tests', 'Strict']),
        isDefault: 1,
      },
      {
        id: 'preset-clean-code',
        name: 'Refactoring & Clean Architecture',
        description:
          'Focus on modularity, zero duplicate code, separation of concerns, and clean naming.',
        systemPrompt:
          'You are an expert software architect. Focus on clean architecture, DRY principles, descriptive naming, modular component design, and concise self-documenting code. Never introduce dead code or unnecessary complexity.',
        category: 'guideline',
        tags: JSON.stringify(['Refactoring', 'Clean Code', 'Modularity']),
        isDefault: 0,
      },
      {
        id: 'preset-react-tailwind',
        name: 'Modern React 19 & Tailwind CSS',
        description:
          'Specialized instructions for high-polish, accessible React 19 apps with modern Tailwind.',
        systemPrompt:
          'You are a frontend specialist building modern React 19 applications with Tailwind CSS. Follow React modern hooks patterns, avoid unnecessary re-renders, use semantic accessible HTML elements, and maintain sleek UI aesthetics.',
        category: 'guideline',
        tags: JSON.stringify(['React 19', 'Tailwind', 'UI/UX', 'Frontend']),
        isDefault: 0,
      },
      {
        id: 'preset-security-audit',
        name: 'Security & Defensive Coding',
        description:
          'Audit for vulnerabilities, sanitize all inputs, validate schemas with Zod, prevent SQLi/XSS.',
        systemPrompt:
          'You are a defensive security engineer. Rigorously validate all untrusted inputs with Zod, avoid shell injection vulnerabilities, sanitize file path resolution against path traversal, and protect sensitive environment variables.',
        category: 'security',
        tags: JSON.stringify(['Security', 'Zod', 'Sanitization', 'Audit']),
        isDefault: 0,
      },
      {
        id: 'preset-speed-prototype',
        name: 'Fast Prototyping & Pragmatic MVP',
        description:
          'Speed up development cycles, prioritize working functionality, and ship features rapidly.',
        systemPrompt:
          'You are a high-velocity product engineer. Focus on rapid delivery of functional features with pragmatic architecture, minimal boilerplate, and fast iteration loops.',
        category: 'persona',
        tags: JSON.stringify(['MVP', 'Speed', 'Prototype']),
        isDefault: 0,
      },
    ]

    const insertPreset = db.prepare(`
      INSERT INTO instruction_presets (id, name, description, system_prompt, category, tags, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = Date.now()
    for (const preset of defaultPresets) {
      insertPreset.run(
        preset.id,
        preset.name,
        preset.description,
        preset.systemPrompt,
        preset.category,
        preset.tags,
        preset.isDefault,
        now,
      )
    }
  }

  db.prepare(
    `UPDATE sessions
     SET status = 'error', updated_at = ?
     WHERE status = 'active'`,
  ).run(Date.now())
}

function createDatabaseState(): DbState {
  const settings = readAppSettings()
  ensureDataDirectory(settings.dataDir)

  try {
    const db = new Database(settings.dbFile)
    initializeDatabase(db)
    return {
      db,
      path: settings.dbFile,
      warning: null,
      inMemoryFallback: false,
    }
  } catch (error) {
    const db = new Database(':memory:')
    initializeDatabase(db)
    return {
      db,
      path: ':memory:',
      warning:
        error instanceof Error
          ? `Falling back to in-memory SQLite: ${error.message}`
          : 'Falling back to in-memory SQLite.',
      inMemoryFallback: true,
    }
  }
}

function getState(): DbState {
  const nextPath = path.join(readAppSettings().dataDir, 'data.db')

  if (!state || (!state.inMemoryFallback && state.path !== nextPath)) {
    try {
      state?.db.close()
    } catch {
      // Ignore close errors during reconfiguration.
    }
    state = createDatabaseState()
  }

  return state
}

function getDb(): Database.Database {
  return getState().db
}

export function getDbInfo(): DbInfo {
  const dbState = getState()
  return {
    path: dbState.path,
    isInMemoryFallback: dbState.inMemoryFallback,
    warning: dbState.warning,
  }
}

export function listSessions(cwdFilter?: string): SessionRecord[] {
  let query = 'SELECT * FROM sessions'
  const params: unknown[] = []

  if (cwdFilter) {
    query += ' WHERE cwd = ?'
    params.push(cwdFilter)
  }

  query += ' ORDER BY updated_at DESC'

  const rows = getDb().prepare(query).all(...params) as Array<
    Record<string, unknown>
  >

  return rows.map(mapSession)
}

export function getSessionById(sessionId: string): SessionRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(sessionId) as Record<string, unknown> | undefined

  return row ? mapSession(row) : null
}

export function createSessionRecord(input: {
  cwd: string
  model: string
  approvalMode: SessionRecord['approvalMode']
  systemPrompt: string
}): SessionRecord {
  const id = crypto.randomUUID()
  const now = Date.now()

  getDb()
    .prepare(
      `INSERT INTO sessions (
        id, title, cwd, model, approval_mode, status, system_prompt, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      'Untitled session',
      input.cwd,
      input.model,
      input.approvalMode,
      'active',
      input.systemPrompt,
      now,
      now,
    )

  touchWorkspace(input.cwd)

  addActivityLog({
    sessionId: id,
    eventType: 'session_created',
    summary: `Created session with ${input.model}`,
    details: {
      cwd: input.cwd,
      model: input.model,
      approvalMode: input.approvalMode,
    },
    actor: 'user',
  })

  const session = getSessionById(id)
  if (!session) {
    throw new Error('Failed to create the session record.')
  }

  return session
}

export function updateSessionStatus(
  sessionId: string,
  status: SessionRecord['status'],
): void {
  getDb()
    .prepare(`UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?`)
    .run(status, Date.now(), sessionId)

  addActivityLog({
    sessionId,
    eventType: status === 'ended' ? 'session_ended' : 'session_interrupted',
    summary: `Session marked as ${status}`,
    details: { status },
    actor: 'system',
  })
}

export function touchSession(sessionId: string): void {
  getDb()
    .prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`)
    .run(Date.now(), sessionId)
}

export function addSystemMessage(sessionId: string, content: string): void {
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO messages (id, session_id, role, content, raw_ansi, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(crypto.randomUUID(), sessionId, 'system', content, null, now)
  touchSession(sessionId)
}

export function addUserMessage(
  sessionId: string,
  content: string,
): MessageRecord {
  const now = Date.now()
  const msgId = crypto.randomUUID()

  getDb()
    .prepare(
      `INSERT INTO messages (id, session_id, role, content, raw_ansi, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(msgId, sessionId, 'user', content, null, now)

  const session = getSessionById(sessionId)
  if (session && session.title === 'Untitled session') {
    getDb()
      .prepare(`UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?`)
      .run(summarizePromptToTitle(content), now, sessionId)
  } else {
    touchSession(sessionId)
  }

  createCheckpoint({
    sessionId,
    messageId: msgId,
    promptText: content,
    affectedFiles: [],
  })

  addActivityLog({
    sessionId,
    eventType: 'prompt_submitted',
    summary: `Prompt submitted: ${content.slice(0, 60)}${content.length > 60 ? '…' : ''}`,
    details: { prompt: content },
    actor: 'user',
  })

  return {
    id: msgId,
    sessionId,
    role: 'user',
    content,
    rawAnsi: null,
    createdAt: now,
  }
}

export function addAssistantOutput(sessionId: string, rawAnsi: string): void {
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO messages (id, session_id, role, content, raw_ansi, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      sessionId,
      'assistant',
      stripAnsi(rawAnsi),
      rawAnsi,
      now,
    )
  touchSession(sessionId)
}

export function getSessionMessages(sessionId: string): MessageRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT *
       FROM messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
    )
    .all(sessionId) as Array<Record<string, unknown>>

  return rows.map(mapMessage)
}

export function hasUserMessages(sessionId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS count
       FROM messages
       WHERE session_id = ? AND role = 'user'`,
    )
    .get(sessionId) as { count: number }

  return row.count > 0
}

export function addFileChange(input: {
  sessionId: string
  filePath: string
  changeType: FileChangeRecord['changeType']
  diff: string | null
  snapshotBefore: string | null
  snapshotAfter: string | null
}): FileChangeRecord {
  const id = crypto.randomUUID()
  const now = Date.now()

  getDb()
    .prepare(
      `INSERT INTO file_changes (
        id, session_id, file_path, change_type, diff, snapshot_before, snapshot_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.sessionId,
      input.filePath,
      input.changeType,
      input.diff,
      input.snapshotBefore,
      input.snapshotAfter,
      now,
    )

  touchSession(input.sessionId)
  updateLatestCheckpointWithFile(input.sessionId, input.filePath)

  addActivityLog({
    sessionId: input.sessionId,
    eventType: 'file_diff_staged',
    summary: `Staged ${input.changeType}: ${input.filePath}`,
    details: {
      filePath: input.filePath,
      changeType: input.changeType,
      hasDiff: Boolean(input.diff),
    },
    actor: 'codex',
  })

  const row = getDb()
    .prepare(`SELECT * FROM file_changes WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined

  if (!row) {
    throw new Error('Failed to store the file change.')
  }

  return mapFileChange(row)
}

export function getFileChanges(sessionId: string): FileChangeRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT *
       FROM file_changes
       WHERE session_id = ?
       ORDER BY created_at DESC`,
    )
    .all(sessionId) as Array<Record<string, unknown>>

  return rows.map(mapFileChange)
}

export function getFileChangeById(
  sessionId: string,
  changeId: string,
): FileChangeRecord | null {
  const row = getDb()
    .prepare(
      `SELECT *
       FROM file_changes
       WHERE session_id = ? AND id = ?`,
    )
    .get(sessionId, changeId) as Record<string, unknown> | undefined

  return row ? mapFileChange(row) : null
}

export function getLatestFileChange(
  sessionId: string,
): FileChangeRecord | null {
  const row = getDb()
    .prepare(
      `SELECT *
       FROM file_changes
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(sessionId) as Record<string, unknown> | undefined

  return row ? mapFileChange(row) : null
}

export function getSessionHistoryAnsi(sessionId: string): string {
  const rows = getDb()
    .prepare(
      `SELECT raw_ansi
       FROM messages
       WHERE session_id = ? AND raw_ansi IS NOT NULL
       ORDER BY created_at ASC`,
    )
    .all(sessionId) as Array<{ raw_ansi: string }>

  return rows.map((row) => row.raw_ansi).join('')
}

export function createCheckpoint(input: {
  sessionId: string
  messageId?: string | null
  promptText: string
  affectedFiles?: string[]
}): CheckpointRecord {
  const id = crypto.randomUUID()
  const now = Date.now()
  const filesJson = JSON.stringify(input.affectedFiles || [])

  getDb()
    .prepare(
      `INSERT INTO checkpoints (
        id, session_id, message_id, prompt_text, affected_files, file_changes_count, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
    )
    .run(
      id,
      input.sessionId,
      input.messageId || null,
      input.promptText,
      filesJson,
      input.affectedFiles?.length || 0,
      now,
    )

  return {
    id,
    sessionId: input.sessionId,
    messageId: input.messageId || null,
    promptText: input.promptText,
    affectedFiles: input.affectedFiles || [],
    fileChangesCount: input.affectedFiles?.length || 0,
    status: 'active',
    createdAt: now,
  }
}

export function updateLatestCheckpointWithFile(
  sessionId: string,
  filePath: string,
): void {
  const latest = getDb()
    .prepare(
      `SELECT * FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(sessionId) as Record<string, unknown> | undefined

  if (!latest) return

  let files: string[] = []
  try {
    files = JSON.parse(String(latest.affected_files || '[]'))
  } catch {
    files = []
  }

  if (!files.includes(filePath)) {
    files.push(filePath)
    getDb()
      .prepare(
        `UPDATE checkpoints SET affected_files = ?, file_changes_count = ? WHERE id = ?`,
      )
      .run(JSON.stringify(files), files.length, latest.id)
  }
}

export function getSessionCheckpoints(sessionId: string): CheckpointRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC`,
    )
    .all(sessionId) as Array<Record<string, unknown>>

  return rows.map(mapCheckpoint)
}

export async function rollbackToCheckpoint(
  sessionId: string,
  targetTimestamp: number,
): Promise<{ revertedFilesCount: number }> {
  const session = getSessionById(sessionId)
  if (!session) throw new Error('Session not found.')

  const newerChanges = getDb()
    .prepare(
      `SELECT * FROM file_changes WHERE session_id = ? AND created_at >= ? ORDER BY created_at DESC`,
    )
    .all(sessionId, targetTimestamp) as Array<Record<string, unknown>>

  const uniqueFilesReverted = new Set<string>()

  for (const row of newerChanges) {
    const change = mapFileChange(row)
    if (!uniqueFilesReverted.has(change.filePath)) {
      await rollbackFileToSnapshot(
        session.cwd,
        change.filePath,
        change.snapshotBefore,
        change.changeType,
      )
      uniqueFilesReverted.add(change.filePath)
    }
  }

  getDb()
    .prepare(
      `UPDATE checkpoints SET status = 'rolled_back' WHERE session_id = ? AND created_at >= ?`,
    )
    .run(sessionId, targetTimestamp)

  touchSession(sessionId)

  addActivityLog({
    sessionId,
    eventType: 'checkpoint_rollback',
    summary: `Rolled back ${uniqueFilesReverted.size} file(s) to checkpoint`,
    details: {
      revertedFilesCount: uniqueFilesReverted.size,
      revertedFiles: Array.from(uniqueFilesReverted),
      targetTimestamp,
    },
    actor: 'user',
  })

  return { revertedFilesCount: uniqueFilesReverted.size }
}

export function listWorkspaces(): WorkspaceRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT w.*, (SELECT COUNT(*) FROM sessions s WHERE s.cwd = w.path) as session_count
       FROM workspaces w
       ORDER BY last_opened_at DESC`,
    )
    .all() as Array<Record<string, unknown>>

  return rows.map(mapWorkspace)
}

export function touchWorkspace(pathStr: string, name?: string): WorkspaceRecord {
  const db = getDb()
  const existing = db
    .prepare(`SELECT * FROM workspaces WHERE path = ?`)
    .get(pathStr) as Record<string, unknown> | undefined

  const now = Date.now()
  const workspaceName = name || path.basename(pathStr) || pathStr

  if (existing) {
    db.prepare(
      `UPDATE workspaces SET last_opened_at = ?, name = COALESCE(?, name) WHERE path = ?`,
    ).run(now, name || null, pathStr)
  } else {
    db.prepare(
      `INSERT INTO workspaces (id, path, name, last_opened_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(crypto.randomUUID(), pathStr, workspaceName, now, now)
  }

  const updated = db
    .prepare(`SELECT * FROM workspaces WHERE path = ?`)
    .get(pathStr) as Record<string, unknown>
  return mapWorkspace(updated)
}

export function removeWorkspace(id: string): void {
  getDb().prepare(`DELETE FROM workspaces WHERE id = ?`).run(id)
}

export function listGuardrailRules(): GuardrailRule[] {
  const rows = getDb()
    .prepare(`SELECT * FROM guardrail_rules ORDER BY is_system DESC, name ASC`)
    .all() as Array<Record<string, unknown>>

  return rows.map(mapGuardrailRule)
}

export function saveGuardrailRule(input: {
  id?: string
  name: string
  description?: string
  pattern: string
  action: GuardrailRule['action']
  enabled?: boolean
}): GuardrailRule {
  const db = getDb()
  const id = input.id || crypto.randomUUID()
  const now = Date.now()
  const enabled = input.enabled !== undefined ? (input.enabled ? 1 : 0) : 1

  const existing = db
    .prepare(`SELECT * FROM guardrail_rules WHERE id = ?`)
    .get(id)

  if (existing) {
    db.prepare(
      `UPDATE guardrail_rules
       SET name = ?, description = ?, pattern = ?, action = ?, enabled = ?
       WHERE id = ?`,
    ).run(
      input.name,
      input.description || '',
      input.pattern,
      input.action,
      enabled,
      id,
    )
  } else {
    db.prepare(
      `INSERT INTO guardrail_rules (id, name, description, pattern, action, enabled, is_system, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    ).run(id, input.name, input.description || '', input.pattern, input.action, enabled, now)
  }

  const updated = db
    .prepare(`SELECT * FROM guardrail_rules WHERE id = ?`)
    .get(id) as Record<string, unknown>
  return mapGuardrailRule(updated)
}

export function toggleGuardrailRule(
  id: string,
  enabled: boolean,
): GuardrailRule {
  getDb()
    .prepare(`UPDATE guardrail_rules SET enabled = ? WHERE id = ?`)
    .run(enabled ? 1 : 0, id)

  const updated = getDb()
    .prepare(`SELECT * FROM guardrail_rules WHERE id = ?`)
    .get(id) as Record<string, unknown>
  return mapGuardrailRule(updated)
}

export function deleteGuardrailRule(id: string): void {
  getDb()
    .prepare(`DELETE FROM guardrail_rules WHERE id = ? AND is_system = 0`)
    .run(id)
}

export function listInstructionPresets(): InstructionPreset[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM instruction_presets ORDER BY is_default DESC, name ASC`,
    )
    .all() as Array<Record<string, unknown>>

  return rows.map(mapInstructionPreset)
}

export function saveInstructionPreset(input: {
  id?: string
  name: string
  description?: string
  systemPrompt: string
  category: InstructionPreset['category']
  tags?: string[]
}): InstructionPreset {
  const db = getDb()
  const id = input.id || crypto.randomUUID()
  const now = Date.now()
  const tagsJson = JSON.stringify(input.tags || [])

  const existing = db
    .prepare(`SELECT * FROM instruction_presets WHERE id = ?`)
    .get(id)

  if (existing) {
    db.prepare(
      `UPDATE instruction_presets
       SET name = ?, description = ?, system_prompt = ?, category = ?, tags = ?
       WHERE id = ?`,
    ).run(
      input.name,
      input.description || '',
      input.systemPrompt,
      input.category,
      tagsJson,
      id,
    )
  } else {
    db.prepare(
      `INSERT INTO instruction_presets (id, name, description, system_prompt, category, tags, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    ).run(
      id,
      input.name,
      input.description || '',
      input.systemPrompt,
      input.category,
      tagsJson,
      now,
    )
  }

  const updated = db
    .prepare(`SELECT * FROM instruction_presets WHERE id = ?`)
    .get(id) as Record<string, unknown>
  return mapInstructionPreset(updated)
}

export function deleteInstructionPreset(id: string): void {
  getDb()
    .prepare(`DELETE FROM instruction_presets WHERE id = ? AND is_default = 0`)
    .run(id)
}

export function addTestRun(result: TestRunResult): void {
  getDb()
    .prepare(
      `INSERT INTO test_runs (id, session_id, command, exit_code, stdout, stderr, duration_ms, passed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      result.id,
      result.sessionId,
      result.command,
      result.exitCode,
      result.stdout,
      result.stderr,
      result.durationMs,
      result.passed ? 1 : 0,
      result.createdAt,
    )

  addActivityLog({
    sessionId: result.sessionId,
    eventType: result.passed ? 'test_run_passed' : 'test_run_failed',
    summary: `Test run ${result.passed ? 'passed' : 'failed'} (${result.durationMs}ms): ${result.command}`,
    details: {
      command: result.command,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      passed: result.passed,
    },
    actor: 'system',
  })
}

export function getLatestTestRun(sessionId: string): TestRunResult | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM test_runs WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(sessionId) as Record<string, unknown> | undefined

  return row ? mapTestRun(row) : null
}

export function addActivityLog(input: {
  sessionId?: string | null
  eventType: ActivityLogEventType
  summary: string
  details?: Record<string, unknown>
  actor?: ActivityActor
}): ActivityLogRecord {
  const id = crypto.randomUUID()
  const now = Date.now()
  const detailsJson = JSON.stringify(input.details || {})
  const actor = input.actor || 'system'
  const sessionId = input.sessionId || null

  getDb()
    .prepare(
      `INSERT INTO activity_logs (id, session_id, event_type, summary, details, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, sessionId, input.eventType, input.summary, detailsJson, actor, now)

  return {
    id,
    sessionId,
    eventType: input.eventType,
    summary: input.summary,
    details: input.details || {},
    actor,
    createdAt: now,
  }
}

export function listActivityLogs(filter?: {
  sessionId?: string
  limit?: number
}): ActivityLogRecord[] {
  let query = 'SELECT * FROM activity_logs'
  const params: unknown[] = []

  if (filter?.sessionId) {
    query += ' WHERE session_id = ?'
    params.push(filter.sessionId)
  }

  query += ' ORDER BY created_at DESC'

  if (filter?.limit) {
    query += ' LIMIT ?'
    params.push(filter.limit)
  } else {
    query += ' LIMIT 100'
  }

  const rows = getDb().prepare(query).all(...params) as Array<
    Record<string, unknown>
  >

  return rows.map(mapActivityLog)
}

export function clearActivityLogs(sessionId?: string): void {
  if (sessionId) {
    getDb()
      .prepare(`DELETE FROM activity_logs WHERE session_id = ?`)
      .run(sessionId)
  } else {
    getDb().prepare(`DELETE FROM activity_logs`).run()
  }
}
