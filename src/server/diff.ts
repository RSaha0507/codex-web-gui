import { createTwoFilesPatch } from 'diff'

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

export function detectApprovalRequest(
  output: string,
  latestDiff: { filePath: string; diff: string | null } | null,
): { description: string; filePath: string | null; diff: string | null } | null {
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
      /\b(approve|reject|allow|permission|continue|apply|run)\b/i.test(line) ||
      /(?:\[y\/n\]|\(y\/n\)|\by\/n\b)/i.test(line)
    ) {
      matchedLine = line
      break
    }
  }

  if (!matchedLine) {
    return null
  }

  return {
    description: matchedLine,
    filePath: latestDiff?.filePath ?? null,
    diff: latestDiff?.diff ?? null,
  }
}
