import { promises as fs } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import {
  FILE_PREVIEW_BYTE_LIMIT,
  TEXT_SNAPSHOT_LIMIT,
  WATCH_IGNORE_SEGMENTS,
} from '#/lib/constants'
import type { FileTreeNode } from '#/lib/types'

function isIgnoredPathSegment(value: string): boolean {
  return value.split(/[\\/]+/).some((part) => WATCH_IGNORE_SEGMENTS.has(part))
}

export function sanitizeWorkingDirectory(input: string): string {
  return resolve(input)
}

export function ensurePathInsideSession(
  cwd: string,
  candidatePath: string,
): string {
  const resolved = resolve(cwd, candidatePath)
  const relativePath = relative(cwd, resolved)

  if (
    relativePath.startsWith('..') ||
    isAbsolute(relativePath) ||
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
      const absolutePath = resolve(absoluteDir, entry.name)
      const nodePath = relative(cwd, absolutePath).replaceAll('\\', '/')

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
