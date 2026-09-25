import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import type { TestRunResult } from '#/lib/types'
import { addTestRun } from './sessions'

export async function executeTestRunner(
  sessionId: string,
  cwd: string,
  command = 'npm test',
  timeoutMs = 60_000,
): Promise<TestRunResult> {
  const startTime = Date.now()
  let stdout = ''
  let stderr = ''
  const testId = crypto.randomUUID()

  return new Promise<TestRunResult>((resolve) => {
    let resolved = false

    const child = spawn(command, {
      cwd,
      shell: true,
      env: {
        ...process.env,
        CI: 'true',
        FORCE_COLOR: '1',
      },
    })

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        child.kill('SIGTERM')
        const durationMs = Date.now() - startTime
        const result: TestRunResult = {
          id: testId,
          sessionId,
          command,
          exitCode: -1,
          stdout: stdout + '\n[Test run timed out after 60 seconds]',
          stderr,
          durationMs,
          passed: false,
          createdAt: Date.now(),
        }
        addTestRun(result)
        resolve(result)
      }
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
      if (stdout.length > 200_000) {
        stdout = stdout.slice(-200_000)
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
      if (stderr.length > 100_000) {
        stderr = stderr.slice(-100_000)
      }
    })

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        const durationMs = Date.now() - startTime
        const result: TestRunResult = {
          id: testId,
          sessionId,
          command,
          exitCode: 1,
          stdout,
          stderr: stderr + `\nExecution error: ${err.message}`,
          durationMs,
          passed: false,
          createdAt: Date.now(),
        }
        addTestRun(result)
        resolve(result)
      }
    })

    child.on('close', (code) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        const durationMs = Date.now() - startTime
        const exitCode = code ?? 0
        const passed = exitCode === 0

        const result: TestRunResult = {
          id: testId,
          sessionId,
          command,
          exitCode,
          stdout: stdout || (passed ? 'All tests completed successfully with exit code 0.' : 'Test command failed.'),
          stderr,
          durationMs,
          passed,
          createdAt: Date.now(),
        }
        addTestRun(result)
        resolve(result)
      }
    })
  })
}
