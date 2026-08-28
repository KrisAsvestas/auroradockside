import { spawn, type ChildProcess } from 'child_process'
import type { WebContents } from 'electron'
import { AURORA_ENV, powerOffProjects } from './auroraEngine'
const running = new Map<string, ChildProcess>()
const cancelledIds = new Set<string>()
const ANSI_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g
const stripAnsi = (s: string) => s.replace(ANSI_PATTERN, '')
export function runCommandStreamed(
  operationId: string,
  command: string,
  args: string[],
  sender: WebContents,
  options: { cwd?: string; emitExit?: boolean; env?: NodeJS.ProcessEnv } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...AURORA_ENV, ...options.env },
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    running.set(operationId, child)
    const tail: string[] = []
    const forward = (stream: 'stdout' | 'stderr') => (data: Buffer) => {
      const chunk = stripAnsi(data.toString())
      tail.push(chunk)
      if (tail.length > 20) tail.shift()
      if (!sender.isDestroyed()) sender.send('terminal:data', { operationId, stream, chunk })
    }
    child.stdout.on('data', forward('stdout'))
    child.stderr.on('data', forward('stderr'))
    child.on('error', (e) => {
      running.delete(operationId)
      if (options.emitExit !== false && !sender.isDestroyed())
        sender.send('terminal:exit', { operationId, exitCode: null, cancelled: false })
      reject(e)
    })
    child.on('close', (code) => {
      running.delete(operationId)
      const cancelled = cancelledIds.delete(operationId)
      if (options.emitExit !== false && !sender.isDestroyed())
        sender.send('terminal:exit', { operationId, exitCode: code, cancelled })
      if (cancelled) reject(new Error('Command cancelled'))
      else if (code === 0) resolve()
      else reject(new Error(tail.join('').trim() || `${command} exited with code ${code}`))
    })
  })
}
export function cancelCommand(id: string): boolean {
  const c = running.get(id)
  if (!c) return false
  cancelledIds.add(id)
  c.kill()
  return true
}
export function startLogStream(
  operationId: string,
  command: string,
  args: string[],
  sender: WebContents,
  options: { cwd?: string } = {}
): void {
  const child = spawn(command, args, {
    env: AURORA_ENV,
    cwd: options.cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  running.set(operationId, child)
  const f = (stream: 'stdout' | 'stderr') => (d: Buffer) => {
    if (!sender.isDestroyed())
      sender.send('logs:data', { operationId, stream, chunk: stripAnsi(d.toString()) })
  }
  child.stdout.on('data', f('stdout'))
  child.stderr.on('data', f('stderr'))
  const done = () => {
    running.delete(operationId)
    if (!sender.isDestroyed()) sender.send('logs:exit', { operationId })
  }
  child.on('close', done)
  child.on('error', done)
}
export function killAllRunningCommands(): void {
  for (const c of running.values()) c.kill()
  running.clear()
}
export async function powerOffAllProjects(): Promise<void> {
  await powerOffProjects()
}
