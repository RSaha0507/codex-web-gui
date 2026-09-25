import { createTwoFilesPatch } from 'diff'
import type {
  DiffHunkLine,
  GuardrailRule,
  ParsedDiffHunk,
  ParsedFileDiff,
  TokenMetrics,
} from './types'

const ANSI_PATTERN =
  /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g // eslint-disable-line no-control-regex

export function stripAnsi(input: string): string {
  return input.replaceAll(ANSI_PATTERN, '')
}

export function summarizePromptToTitle(prompt: string): string {
  const normalized = prompt.replaceAll(/\s+/g, ' ').trim()
  if (!normalized) {
    return 'Untitled session'
  }

  return normalized.slice(0, 60)
}

export function computeUnifiedDiff(
  filePath: string,
  before: string | null,
  after: string | null,
): string | null {
  if (before === null && after === null) {
    return null
  }

  return createTwoFilesPatch(
    filePath,
    filePath,
    before ?? '',
    after ?? '',
    '',
    '',
    {
      context: 3,
    },
  )
}

/**
 * Parse a unified diff string into granular hunks with line-by-line classification
 * and line number tracking for side-by-side / unified diff viewer.
 */
export function parseUnifiedDiff(diffText: string): ParsedFileDiff[] {
  if (!diffText.trim()) {
    return []
  }

  const lines = diffText.split(/\r?\n/)
  const fileDiffs: ParsedFileDiff[] = []
  let currentFile: ParsedFileDiff | null = null
  let currentHunk: ParsedDiffHunk | null = null
  let oldLineCounter = 0
  let newLineCounter = 0
  let hunkCounter = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('--- ')) {
      const oldPath = line.slice(4).trim().replace(/^[ab]\//, '')
      const nextLine = lines[i + 1] || ''
      const newPath = nextLine.startsWith('+++ ')
        ? nextLine.slice(4).trim().replace(/^[ab]\//, '')
        : oldPath

      currentFile = {
        filePath: newPath || oldPath || 'unknown',
        oldPath,
        newPath,
        hunks: [],
        addedCount: 0,
        deletedCount: 0,
      }
      fileDiffs.push(currentFile)
      if (nextLine.startsWith('+++ ')) {
        i++
      }
      continue
    }

    // Check for hunk header @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/)
    if (hunkMatch) {
      if (!currentFile) {
        currentFile = {
          filePath: 'current',
          oldPath: 'current',
          newPath: 'current',
          hunks: [],
          addedCount: 0,
          deletedCount: 0,
        }
        fileDiffs.push(currentFile)
      }

      const rawOldStart = hunkMatch[1]
      const rawOldCount = hunkMatch[2]
      const rawNewStart = hunkMatch[3]
      const rawNewCount = hunkMatch[4]

      const oldStart = rawOldStart ? parseInt(rawOldStart, 10) : 1
      const oldCount = rawOldCount ? parseInt(rawOldCount, 10) : 1
      const newStart = rawNewStart ? parseInt(rawNewStart, 10) : 1
      const newCount = rawNewCount ? parseInt(rawNewCount, 10) : 1

      oldLineCounter = oldStart
      newLineCounter = newStart
      hunkCounter++

      currentHunk = {
        id: `hunk-${hunkCounter}-${oldStart}-${newStart}`,
        index: hunkCounter,
        header: line,
        oldStart,
        oldCount,
        newStart,
        newCount,
        lines: [],
        isAccepted: true,
        rawText: `${line}\n`,
      }
      currentFile.hunks.push(currentHunk)
      continue
    }

    if (currentHunk && currentFile) {
      currentHunk.rawText += `${line}\n`

      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({
          type: 'add',
          text: line.slice(1),
          newLineNumber: newLineCounter++,
        })
        currentFile.addedCount++
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({
          type: 'delete',
          text: line.slice(1),
          oldLineNumber: oldLineCounter++,
        })
        currentFile.deletedCount++
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({
          type: 'context',
          text: line.startsWith(' ') ? line.slice(1) : line,
          oldLineNumber: oldLineCounter++,
          newLineNumber: newLineCounter++,
        })
      }
    }
  }

  return fileDiffs
}

/**
 * Reconstructs file content by selectively applying only the accepted hunks
 * to the original file snapshot.
 */
export function applyAcceptedHunksToContent(
  originalContent: string,
  hunks: ParsedDiffHunk[],
  acceptedHunkIds: Set<string>,
): string {
  if (hunks.length === 0) {
    return originalContent
  }

  const originalLines = originalContent.split(/\r?\n/)
  const resultLines: string[] = []
  let cursor = 0

  for (const hunk of hunks) {
    const hunkStart0 = hunk.oldStart > 0 ? hunk.oldStart - 1 : 0

    while (cursor < hunkStart0 && cursor < originalLines.length) {
      resultLines.push(originalLines[cursor])
      cursor++
    }

    const isAccepted = acceptedHunkIds.has(hunk.id)

    if (isAccepted) {
      for (const hunkLine of hunk.lines) {
        if (hunkLine.type === 'context') {
          resultLines.push(hunkLine.text)
          cursor++
        } else if (hunkLine.type === 'add') {
          resultLines.push(hunkLine.text)
        } else if (hunkLine.type === 'delete') {
          cursor++
        }
      }
    } else {
      const hunkEnd0 = hunkStart0 + hunk.oldCount
      while (cursor < hunkEnd0 && cursor < originalLines.length) {
        resultLines.push(originalLines[cursor])
        cursor++
      }
    }
  }

  while (cursor < originalLines.length) {
    resultLines.push(originalLines[cursor])
    cursor++
  }

  return resultLines.join('\n')
}

/**
 * Detect approval requests from terminal output and evaluate against Guardrail rules.
 */
export function detectApprovalRequest(
  output: string,
  latestDiff: { filePath: string; diff: string | null } | null,
  guardrailRules: GuardrailRule[] = [],
): {
  description: string
  filePath: string | null
  diff: string | null
  matchedRule?: {
    id: string
    name: string
    action: 'auto_approve' | 'require_approval' | 'block'
  } | null
} | null {
  const normalized = stripAnsi(output)
  const recentLines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-8)

  let matchedLine: string | undefined

  for (let index = recentLines.length - 1; index >= 0; index -= 1) {
    const line = recentLines[index]
    if (
      /\b(approve|reject|allow|permission|continue|apply|run|execute|confirm)\b/i.test(
        line,
      ) ||
      /(?:\[y\/n\]|\(y\/n\)|\by\/n\b)/i.test(line)
    ) {
      matchedLine = line
      break
    }
  }

  if (!matchedLine) {
    return null
  }

  let matchedRule: {
    id: string
    name: string
    action: 'auto_approve' | 'require_approval' | 'block'
  } | null = null

  const targetText = `${matchedLine} ${latestDiff?.filePath || ''}`

  for (const rule of guardrailRules) {
    if (!rule.enabled) continue
    try {
      const regex = new RegExp(rule.pattern, 'i')
      if (regex.test(targetText) || regex.test(matchedLine)) {
        matchedRule = {
          id: rule.id,
          name: rule.name,
          action: rule.action,
        }
        break
      }
    } catch {
      // Ignore invalid regex
    }
  }

  return {
    description: matchedLine,
    filePath: latestDiff?.filePath ?? null,
    diff: latestDiff?.diff ?? null,
    matchedRule,
  }
}

/**
 * Model Token & Cost Estimator.
 */
const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  'gpt-5-codex': { prompt: 0.005, completion: 0.015 },
  'gpt-4o': { prompt: 0.0025, completion: 0.01 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'o1-preview': { prompt: 0.015, completion: 0.06 },
  'o3-mini': { prompt: 0.0011, completion: 0.0044 },
  'claude-3-5-sonnet': { prompt: 0.003, completion: 0.015 },
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  const words = text.trim().split(/\s+/).length
  const chars = text.length
  return Math.max(Math.ceil(chars / 3.8), Math.ceil(words * 1.3))
}

export function calculateSessionTokenMetrics(
  model: string,
  userPromptsText: string,
  assistantOutputText: string,
  systemPromptText = '',
): TokenMetrics {
  const normModel = model.toLowerCase()
  let pricing = { prompt: 0.003, completion: 0.012 }

  for (const [key, rates] of Object.entries(MODEL_PRICING)) {
    if (normModel.includes(key) || key.includes(normModel)) {
      pricing = rates
      break
    }
  }

  const promptTokens =
    estimateTokens(userPromptsText) + estimateTokens(systemPromptText)
  const completionTokens = estimateTokens(stripAnsi(assistantOutputText))
  const totalTokens = promptTokens + completionTokens

  const estimatedCostUsd =
    (promptTokens / 1000) * pricing.prompt +
    (completionTokens / 1000) * pricing.completion

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(5)),
    model,
    promptCostPer1k: pricing.prompt,
    completionCostPer1k: pricing.completion,
  }
}
