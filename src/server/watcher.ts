import { promises as fs } from 'node:fs'
import { relative, resolve } from 'node:path'
import chokidar from 'chokidar'
import type { FileChangeType } from '#/lib/types'
import { WATCH_IGNORE_SEGMENTS } from '#/lib/constants'
import { computeUnifiedDiff } from './diff'
import { readTextSnapshot } from './files'

type ChangePayload = {
  filePath: string
  changeType: FileChangeType
  diff: string | null
  snapshotBefore: string | null
  snapshotAfter: string | null
}

function shouldIgnoreAbsolutePath(absolutePath: string): boolean {
  return absolutePath
    .split(/[\\/]+/)
    .some((segment) => WATCH_IGNORE_SEGMENTS.has(segment))
}

async function primeSnapshots(
  directory: string,
  snapshots: Map<string, string | null>,
): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true })

  await Promise.all(
    entries.map(async (entry) => {
      if (WATCH_IGNORE_SEGMENTS.has(entry.name)) {
        return
      }

      const absolutePath = resolve(directory, entry.name)

      if (entry.isDirectory()) {
        await primeSnapshots(absolutePath, snapshots)
        return
      }

      try {
        snapshots.set(absolutePath, await readTextSnapshot(absolutePath))
      } catch {
        snapshots.set(absolutePath, null)
      }
    }),
  )
}

export async function createSessionWatcher(
  cwd: string,
  onChange: (payload: ChangePayload) => Promise<void>,
): Promise<{ close: () => Promise<void> }> {
  const snapshots = new Map<string, string | null>()
  await primeSnapshots(cwd, snapshots)

  const watcher = chokidar.watch(cwd, {
    ignored: shouldIgnoreAbsolutePath,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50,
    },
  })

  async function emitChange(
    absolutePath: string,
    changeType: FileChangeType,
  ): Promise<void> {
    if (shouldIgnoreAbsolutePath(absolutePath)) {
      return
    }

    const filePath = relative(cwd, absolutePath).replaceAll('\\', '/')
    const snapshotBefore = snapshots.get(absolutePath) ?? null
    let snapshotAfter: string | null = null

    if (changeType !== 'deleted') {
      snapshotAfter = await readTextSnapshot(absolutePath)
      snapshots.set(absolutePath, snapshotAfter)
    } else {
      snapshots.delete(absolutePath)
    }

    const diff = computeUnifiedDiff(filePath, snapshotBefore, snapshotAfter)
    await onChange({
      filePath,
      changeType,
      diff,
      snapshotBefore,
      snapshotAfter,
    })
  }

  watcher.on('add', (absolutePath) => {
    void emitChange(absolutePath, 'created')
  })
  watcher.on('change', (absolutePath) => {
    void emitChange(absolutePath, 'modified')
  })
  watcher.on('unlink', (absolutePath) => {
    void emitChange(absolutePath, 'deleted')
  })

  return {
    close: async () => watcher.close(),
  }
}
