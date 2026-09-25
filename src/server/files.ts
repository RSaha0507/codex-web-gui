import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FILE_PREVIEW_BYTE_LIMIT,
  TEXT_SNAPSHOT_LIMIT,
  WATCH_IGNORE_SEGMENTS,
} from '#/lib/constants'
import type { DiscoveredRuleFile, FileTreeNode } from '#/lib/types'

function isIgnoredPathSegment(value: string): boolean {
  return value.split(/[\\/]+/).some((part) => WATCH_IGNORE_SEGMENTS.has(part))
}

export function sanitizeWorkingDirectory(input: string): string {
  return path.resolve(input)
}

export function ensurePathInsideSession(
  cwd: string,
  candidatePath: string,
): string {
  const resolved = path.resolve(cwd, candidatePath)
  const relativePath = path.relative(cwd, resolved)

  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    relativePath.includes('\u0000')
  ) {
    throw new Error('Path is outside the session working directory.')
  }

  return resolved
}

export async function assertDirectoryExists(cwd: string): Promise<void> {
  const stats = await fs.stat(cwd)

  if (!stats.isDirectory()) {
    throw new Error('Working directory must be an existing folder.')
  }
}

async function readDirectoryTree(
  cwd: string,
  absoluteDir: string,
): Promise<FileTreeNode[]> {
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true })
  const visibleEntries = entries
    .filter((entry) => !isIgnoredPathSegment(entry.name))
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })

  return Promise.all(
    visibleEntries.map(async (entry) => {
      const absolutePath = path.resolve(absoluteDir, entry.name)
      const nodePath = path.relative(cwd, absolutePath).replaceAll('\\', '/')

      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: nodePath,
          type: 'directory' as const,
          children: await readDirectoryTree(cwd, absolutePath),
        }
      }

      return {
        name: entry.name,
        path: nodePath,
        type: 'file' as const,
      }
    }),
  )
}

export async function buildFileTree(cwd: string): Promise<FileTreeNode[]> {
  return readDirectoryTree(cwd, cwd)
}

function isBinaryBuffer(buffer: Buffer): boolean {
  return buffer.includes(0)
}

export async function readTextSnapshot(
  absolutePath: string,
  limit = TEXT_SNAPSHOT_LIMIT,
): Promise<string | null> {
  try {
    const stats = await fs.stat(absolutePath)

    if (!stats.isFile()) {
      return null
    }

    if (stats.size > limit) {
      return `[file omitted: ${stats.size} bytes exceeds preview limit]`
    }

    const buffer = await fs.readFile(absolutePath)
    if (isBinaryBuffer(buffer)) {
      return '[binary file omitted]'
    }

    return buffer.toString('utf8')
  } catch {
    return null
  }
}

export async function readFilePreview(
  cwd: string,
  relativePath: string,
): Promise<{ content: string; truncated: boolean }> {
  const absolutePath = ensurePathInsideSession(cwd, relativePath)
  const stats = await fs.stat(absolutePath)

  if (!stats.isFile()) {
    throw new Error('Requested path is not a file.')
  }

  const buffer = await fs.readFile(absolutePath)
  if (isBinaryBuffer(buffer)) {
    return {
      content: '[binary file preview unavailable]',
      truncated: false,
    }
  }

  if (buffer.byteLength <= FILE_PREVIEW_BYTE_LIMIT) {
    return {
      content: buffer.toString('utf8'),
      truncated: false,
    }
  }

  return {
    content: buffer.subarray(0, FILE_PREVIEW_BYTE_LIMIT).toString('utf8'),
    truncated: true,
  }
}

export async function saveDirectFileContent(
  cwd: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const absolutePath = ensurePathInsideSession(cwd, relativePath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, content, 'utf8')
}

export async function rollbackFileToSnapshot(
  cwd: string,
  relativePath: string,
  snapshot: string | null,
  changeType: string,
): Promise<void> {
  const absolutePath = ensurePathInsideSession(cwd, relativePath)

  if (changeType === 'created' && snapshot === null) {
    try {
      await fs.unlink(absolutePath)
    } catch {
      // File might already be deleted
    }
    return
  }

  if (snapshot !== null) {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, snapshot, 'utf8')
  }
}

const KNOWN_RULE_FILES: Array<{
  name: string
  fileType: DiscoveredRuleFile['fileType']
}> = [
  { name: 'CODEX.md', fileType: 'codex' },
  { name: 'codex.md', fileType: 'codex' },
  { name: '.cursorrules', fileType: 'cursorrules' },
  { name: '.cursor/rules', fileType: 'cursorrules' },
  { name: 'CLAUDE.md', fileType: 'claude' },
  { name: '.github/copilot-instructions.md', fileType: 'copilot' },
  { name: 'AGENTS.md', fileType: 'custom' },
  { name: 'CONTRIBUTING.md', fileType: 'custom' },
]

export async function discoverWorkspaceRules(
  cwd: string,
): Promise<DiscoveredRuleFile[]> {
  const results: DiscoveredRuleFile[] = []

  for (const item of KNOWN_RULE_FILES) {
    try {
      const fullPath = path.resolve(cwd, item.name)
      const stats = await fs.stat(fullPath)
      if (stats.isFile()) {
        const content = await fs.readFile(fullPath, 'utf8')
        results.push({
          name: item.name,
          path: fullPath,
          relativePath: path.relative(cwd, fullPath).replaceAll('\\', '/'),
          content,
          fileType: item.fileType,
        })
      }
    } catch {
      // File doesn't exist, proceed
    }
  }

  return results
}
