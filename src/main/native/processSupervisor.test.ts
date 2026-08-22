import { mkdtemp, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { allocateNativePorts } from './portAllocator'
import { NativeProcessSupervisor } from './processSupervisor'

describe('native process supervisor', () => {
  it('starts, health-checks, logs, and stops a native service', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aurora-native-supervisor-'))
    const port = (await allocateNativePorts()).http
    const spec = {
      id: 'test-http',
      command: process.execPath,
      args: [
        '-e',
        `const net=require('net');const s=net.createServer(c=>c.end('ok'));s.on('error',e=>{console.error(e);process.exit(1)});s.listen(${port},'127.0.0.1',()=>console.log('ready'));setInterval(()=>{},1000)`
      ],
      cwd: root,
      logPath: join(root, 'service.log'),
      pidPath: join(root, 'service.pid.json'),
      ready: { port, timeoutMs: 5000 }
    }
    const supervisor = new NativeProcessSupervisor()
    try {
      const state = await supervisor.start(spec)
      expect(state.status).toBe('running')
      expect(await supervisor.status(spec)).toBe('running')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(await readFile(spec.logPath, 'utf8')).toContain('ready')
    } finally {
      await supervisor.stop(spec)
    }
    expect(await supervisor.status(spec)).toBe('stopped')
  })
})
