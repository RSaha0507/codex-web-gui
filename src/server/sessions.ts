import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import type { DbInfo, FileChangeRecord, MessageRecord, SessionRecord } from '#/lib/types'
import { stripAnsi, summarizePromptToTitle } from './diff'
import { ensureDataDirectory, readAppSettings } from './settings'

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

    CREATE INDEX IF NOT EXISTS idx_messages_session_id
      ON messages(session_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_file_changes_session_id
      ON file_changes(session_id, created_at DESC);
  `)

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
  const nextPath = join(readAppSettings().dataDir, 'data.db')

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

export function listSessions(): SessionRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT *
       FROM sessions
       ORDER BY updated_at DESC`,
    )
    .all() as Array<Record<string, unknown>>

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
  const id = randomUUID()
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
    .run(randomUUID(), sessionId, 'system', content, null, now)
  touchSession(sessionId)
}

export function addUserMessage(sessionId: string, content: string): void {
  const now = Date.now()
  getDb()
    .prepare(
      `INSERT INTO messages (id, session_id, role, content, raw_ansi, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), sessionId, 'user', content, null, now)

  const session = getSessionById(sessionId)
  if (session && session.title === 'Untitled session') {
    getDb()
      .prepare(`UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?`)
      .run(summarizePromptToTitle(content), now, sessionId)
  } else {
    touchSession(sessionId)
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
      randomUUID(),
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
  const id = randomUUID()
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
