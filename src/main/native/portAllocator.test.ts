import { createServer } from 'net'
import { describe, expect, it } from 'vitest'
import { allocateNativePorts } from './portAllocator'

describe('native port allocator', () => {
  it('allocates four unique loopback ports and releases the reservations', async () => {
    const ports = await allocateNativePorts()
    const values = Object.values(ports)
    expect(new Set(values).size).toBe(4)
    expect(values.every((port) => Number.isInteger(port) && port > 0)).toBe(true)
    const server = createServer()
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(ports.http, '127.0.0.1', () => resolve())
    })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
})
