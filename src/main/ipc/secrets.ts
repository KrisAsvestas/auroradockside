import { ipcMain } from 'electron'
import { chmod, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { AuroraSiteCredentials } from '../../shared/types'

const secretsPath = (root: string): string => join(root, '.aurora', 'secrets.json')

export async function saveSiteCredentials(root: string, credentials: AuroraSiteCredentials): Promise<void> {
  const path = secretsPath(root)
  await writeFile(path, JSON.stringify({ site: credentials }, null, 2) + '\n', { mode: 0o600 })
  if (process.platform !== 'win32') await chmod(path, 0o600)
}

async function readSiteCredentials(root: string): Promise<AuroraSiteCredentials | null> {
  try {
    const data = JSON.parse(await readFile(secretsPath(root), 'utf8')) as { site?: AuroraSiteCredentials }
    return data.site ?? null
  } catch {
    return null
  }
}

export function registerSecretsIpc(): void {
  ipcMain.handle('secrets:getSiteCredentials', async (_event, root: string) => readSiteCredentials(root))
}
