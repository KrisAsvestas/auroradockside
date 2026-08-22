import { createServer, type Server } from 'net'

export interface AuroraNativePorts {
  http: number
  php: number
  database: number
  node: number
}

async function reserveOne(host = '127.0.0.1'): Promise<{ port: number; server: Server }> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, host, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Aurora could not reserve a local service port.'))
        return
      }
      resolve({ port: address.port, server })
    })
  })
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()))
}

export async function allocateNativePorts(): Promise<AuroraNativePorts> {
  const reservations: Array<{ port: number; server: Server }> = []
  try {
    for (let index = 0; index < 4; index += 1) reservations.push(await reserveOne())
    return {
      http: reservations[0].port,
      php: reservations[1].port,
      database: reservations[2].port,
      node: reservations[3].port
    }
  } finally {
    await Promise.all(reservations.map(({ server }) => close(server)))
  }
}
