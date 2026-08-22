import { spawn, type ChildProcess } from 'child_process'
import { createConnection } from 'net'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname } from 'path'

export interface NativeServiceSpec {
  id: string
  command: string
  args: string[]
  cwd: string
  env?: Record<string, string>
  logPath: string
  pidPath: string
  ready?: { host?: string; port: number; timeoutMs?: number }
}

export interface NativeServiceState {
  id: string
  pid: number
  startedAt: string
  status: 'starting' | 'running'
}

type LogListener = (service: string, stream: 'stdout' | 'stderr', chunk: string) => void

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function waitForPort(
  host: string,
  port: number,
  timeoutMs: number,
  child: ChildProcess
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Service exited before port ${port} became ready.`)
    const connected = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ host, port })
      socket.setTimeout(400)
      socket.once('connect', () => {
        socket.destroy()
        resolve(true)
      })
      const failed = (): void => {
        socket.destroy()
        resolve(false)
      }
      socket.once('error', failed)
      socket.once('timeout', failed)
    })
    if (connected) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Service did not become ready on ${host}:${port} within ${timeoutMs}ms.`)
}

async function terminate(pid: number, timeoutMs = 8000): Promise<void> {
  if (!processExists(pid)) return
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    return
  }
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!processExists(pid)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    /* already stopped */
  }
}

export class NativeProcessSupervisor {
  private readonly children = new Map<string, ChildProcess>()
  private readonly listeners = new Set<LogListener>()

  onLog(listener: LogListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(service: string, stream: 'stdout' | 'stderr', chunk: string): void {
    for (const listener of this.listeners) listener(service, stream, chunk)
  }

  async start(spec: NativeServiceSpec): Promise<NativeServiceState> {
    const existing = await this.readState(spec)
    if (existing && processExists(existing.pid)) return { ...existing, status: 'running' }
    await mkdir(dirname(spec.logPath), { recursive: true })
    await mkdir(dirname(spec.pidPath), { recursive: true })
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: { ...process.env, ...spec.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })
    if (!child.pid) throw new Error(`Unable to start native service '${spec.id}'.`)
    this.children.set(spec.id, child)
    let log = ''
    const collect =
      (stream: 'stdout' | 'stderr') =>
      (data: Buffer): void => {
        const chunk = data.toString()
        log += chunk
        if (log.length > 1024 * 1024) log = log.slice(-1024 * 1024)
        void writeFile(spec.logPath, log)
        this.emit(spec.id, stream, chunk)
      }
    child.stdout?.on('data', collect('stdout'))
    child.stderr?.on('data', collect('stderr'))
    const state: NativeServiceState = {
      id: spec.id,
      pid: child.pid,
      startedAt: new Date().toISOString(),
      status: 'starting'
    }
    await writeFile(spec.pidPath, JSON.stringify(state, null, 2) + '\n')
    try {
      if (spec.ready)
        await waitForPort(
          spec.ready.host ?? '127.0.0.1',
          spec.ready.port,
          spec.ready.timeoutMs ?? 15000,
          child
        )
      const running = { ...state, status: 'running' as const }
      await writeFile(spec.pidPath, JSON.stringify(running, null, 2) + '\n')
      child.once('exit', () => {
        this.children.delete(spec.id)
        void rm(spec.pidPath, { force: true })
      })
      return running
    } catch (error) {
      await terminate(child.pid)
      this.children.delete(spec.id)
      await rm(spec.pidPath, { force: true })
      throw error
    }
  }

  async stop(spec: Pick<NativeServiceSpec, 'id' | 'pidPath'>): Promise<void> {
    const state = await this.readState(spec)
    if (state) await terminate(state.pid)
    this.children.delete(spec.id)
    await rm(spec.pidPath, { force: true })
  }

  async status(spec: Pick<NativeServiceSpec, 'id' | 'pidPath'>): Promise<'running' | 'stopped'> {
    const state = await this.readState(spec)
    return state && processExists(state.pid) ? 'running' : 'stopped'
  }

  private async readState(
    spec: Pick<NativeServiceSpec, 'id' | 'pidPath'>
  ): Promise<NativeServiceState | null> {
    try {
      const state = JSON.parse(await readFile(spec.pidPath, 'utf8')) as NativeServiceState
      return state.id === spec.id && Number.isInteger(state.pid) && state.pid > 0 ? state : null
    } catch {
      return null
    }
  }
}
