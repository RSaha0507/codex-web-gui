import type { ApprovalMode, ThemeMode } from './types'

export const APP_NAME = 'Codex CLI Web GUI'
export const STREAM_KEEPALIVE_MS = 15_000
export const STREAM_BATCH_MS = 16
export const STREAM_CONNECTION_LIMIT = 10
export const DEFAULT_PTY_COLS = 220
export const DEFAULT_PTY_ROWS = 50
export const FILE_PREVIEW_BYTE_LIMIT = 256_000
export const TEXT_SNAPSHOT_LIMIT = 512_000
export const WATCH_IGNORE_SEGMENTS = new Set([
  '.git',
  'node_modules',
  '.tanstack',
  '.vinxi',
])
export const THEME_STORAGE_KEY = 'codex-gui-theme'

export const APPROVAL_MODE_OPTIONS: Array<{
  value: ApprovalMode
  label: string
  description: string
}> = [
  {
    value: 'suggest',
    label: 'Suggest',
    description: 'Codex can edit, but it can still stop and request approval.',
  },
  {
    value: 'auto-edit',
    label: 'Auto Edit',
    description: 'Codex edits automatically inside the workspace sandbox.',
  },
  {
    value: 'full-auto',
    label: 'Full Auto',
    description:
      'Codex runs with the CLI full-auto preset for lower-friction execution.',
  },
]

export const THEME_OPTIONS: ThemeMode[] = ['light', 'dark']

export const XTERM_THEME = {
  background: '#0D1117',
  foreground: '#E6EDF3',
  cursor: '#58A6FF',
  selectionBackground: '#388BFD55',
  black: '#484F58',
  red: '#FF7B72',
  green: '#3FB950',
  yellow: '#D29922',
  blue: '#58A6FF',
  magenta: '#BC8CFF',
  cyan: '#39C5CF',
  white: '#B1BAC4',
}
