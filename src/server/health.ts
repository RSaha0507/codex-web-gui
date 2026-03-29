import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { CodexHealth } from '#/lib/types'

let cached: { expiresAt: number; value: CodexHealth } | null = null

type CodexLaunchSpec = {
  command: string
  args: string[]
  displayCommand: string
}

function resolveCodexExecutable(): string {
  if (process.platform !== 'win32') {
    return 'codex'
  }

  const appData = process.env.APPDATA
  if (appData) {
    const cmdPath = join(appData, 'npm', 'codex.cmd')
    if (existsSync(cmdPath)) {
      return cmdPath
    }
  }

  const whereResult = spawnSync('where', ['codex'], {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
    timeout: 4_000,
  })

  if (whereResult.status === 0) {
    const firstMatch = whereResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)

    if (firstMatch) {
      return firstMatch
    }
  }

  return 'codex'
}

function readWindowsCodexVersion(executable: string): string | null {
  const packageJsonPath = join(
    dirname(executable),
    'node_modules',
    '@openai',
    'codex',
    'package.json',
  )

  if (!existsSync(packageJsonPath)) {
    return null
  }

  try {
    const raw = readFileSync(packageJsonPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      version?: unknown
    }

    return typeof parsed.version === 'string'
      ? `codex-cli ${parsed.version}`
      : null
  } catch {
    return null
  }
}

export function getCodexLaunchSpec(extraArgs: string[] = []): CodexLaunchSpec {
  const executable = resolveCodexExecutable()

  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', executable, ...extraArgs],
      displayCommand: executable,
    }
  }

  return {
    command: executable,
    args: extraArgs,
    displayCommand: executable,
  }
}

export function getCodexHealth(): CodexHealth {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  if (process.platform === 'win32') {
    const executable = resolveCodexExecutable()
    const health: CodexHealth =
      executable !== 'codex' && existsSync(executable)
        ? {
            available: true,
            version:
              readWindowsCodexVersion(executable) ||
              'codex-cli (version unavailable)',
            command: executable,
            message: null,
          }
        : {
            available: false,
            version: null,
            command: executable,
            message: 'Codex CLI is not available in PATH.',
          }

    cached = {
      expiresAt: Date.now() + 10_000,
      value: health,
    }

    return health
  }

  const launch = getCodexLaunchSpec(['--version'])
  const result = spawnSync(launch.command, launch.args, {
    encoding: 'utf8',
    timeout: 4_000,
    windowsHide: true,
  })

  const health: CodexHealth =
    result.status === 0
      ? {
          available: true,
          version: result.stdout.trim() || 'unknown',
          command: launch.displayCommand,
          message: null,
        }
      : {
          available: false,
          version: null,
          command: launch.displayCommand,
          message:
            result.error?.message ||
            result.stderr.trim() ||
            'Codex CLI is not available in PATH.',
        }

  cached = {
    expiresAt: Date.now() + 10_000,
    value: health,
  }

  return health
}
