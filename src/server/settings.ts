import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import dotenv from 'dotenv'
import { approvalModeSchema, saveSettingsSchema } from '#/lib/types'
import type { AppSettings, SaveSettingsInput } from '#/lib/types'

const ENV_FILE = resolve(process.cwd(), '.env')

type EnvMap = Record<string, string>

function expandHomePath(input: string): string {
  if (input === '~') {
    return homedir()
  }

  if (input.startsWith('~/') || input.startsWith('~\\')) {
    return join(homedir(), input.slice(2))
  }

  return input
}

function parseEnvFile(): EnvMap {
  if (!existsSync(ENV_FILE)) {
    return {}
  }

  return dotenv.parse(readFileSync(ENV_FILE, 'utf8'))
}

function quoteEnvValue(value: string): string {
  if (!value) {
    return ''
  }

  if (/[#\s"'`]/.test(value)) {
    return JSON.stringify(value)
  }

  return value
}

export function getProjectEnvPath(): string {
  return ENV_FILE
}

export function readAppSettings(): AppSettings {
  const env = parseEnvFile()
  const dataDirRaw = env.CODEX_DATA_DIR || '~/.codex-gui'
  const dataDir = resolve(expandHomePath(dataDirRaw))

  const defaultApproval = approvalModeSchema.safeParse(
    env.CODEX_DEFAULT_APPROVAL,
  )

  return {
    openAiApiKey: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    defaultModel:
      env.CODEX_DEFAULT_MODEL || process.env.CODEX_DEFAULT_MODEL || 'gpt-5-codex',
    defaultApprovalMode: defaultApproval.success
      ? defaultApproval.data
      : 'suggest',
    defaultCwd: resolve(expandHomePath(env.CODEX_DEFAULT_CWD || homedir())),
    dataDir,
    dbFile: join(dataDir, 'data.db'),
    host: env.HOST || process.env.HOST || '0.0.0.0',
    port: env.PORT || process.env.PORT || '3000',
  }
}

export function saveAppSettings(input: SaveSettingsInput): AppSettings {
  const parsed = saveSettingsSchema.parse(input)
  const current = parseEnvFile()
  const next: EnvMap = {
    ...current,
    OPENAI_API_KEY: parsed.openAiApiKey,
    CODEX_DEFAULT_MODEL: parsed.defaultModel,
    CODEX_DEFAULT_APPROVAL: parsed.defaultApprovalMode,
    CODEX_DEFAULT_CWD: parsed.defaultCwd,
    CODEX_DATA_DIR: parsed.dataDir,
    HOST: parsed.host,
    PORT: parsed.port,
  }

  const lines = Object.entries(next)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${quoteEnvValue(value)}`)

  writeFileSync(ENV_FILE, `${lines.join('\n')}\n`, 'utf8')

  return readAppSettings()
}

export function ensureDataDirectory(dataDir: string): void {
  mkdirSync(dataDir, { recursive: true })
}
