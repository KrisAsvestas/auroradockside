import { dialog, ipcMain } from 'electron'
import { createReadStream, createWriteStream } from 'fs'
import { mkdir, readdir, rm, stat } from 'fs/promises'
import { basename, join } from 'path'
import { spawn } from 'child_process'
import { createGunzip, createGzip } from 'zlib'
import { AURORA_ENV, getProjectConfigByRoot } from '../auroraEngine'
import type { AuroraSnapshot } from '../../shared/types'

const snapshotsDir = (root: string): string => join(root, '.aurora', 'snapshots')
const composeFile = (root: string): string => join(root, '.aurora', 'compose.yaml')

function safeSnapshotName(value?: string): string {
  const fallback = new Date().toISOString().replace(/[:.]/g, '-')
  const safe = (value?.trim() || fallback).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return safe || fallback
}

function dbCommand(type: 'mariadb' | 'postgres', mode: 'dump' | 'restore'): { command: string; args: string[] } {
  if (type === 'postgres') {
    return mode === 'dump'
      ? { command: 'pg_dump', args: ['-U', 'db', '-d', 'db', '--clean', '--if-exists'] }
      : { command: 'psql', args: ['-U', 'db', '-d', 'db', '-v', 'ON_ERROR_STOP=1'] }
  }
  return mode === 'dump'
    ? { command: 'mariadb-dump', args: ['-udb', '-pdb', '--single-transaction', '--routines', '--triggers', 'db'] }
    : { command: 'mariadb', args: ['-udb', '-pdb', 'db'] }
}

function runDatabasePipe(root: string, type: 'mariadb' | 'postgres', mode: 'dump' | 'restore', filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = dbCommand(type, mode)
    const child = spawn('docker', ['compose', '-f', composeFile(root), 'exec', '-T', 'db', db.command, ...db.args], {
      cwd: root, env: AURORA_ENV, stdio: ['pipe', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    const gz = filePath.endsWith('.gz')
    let outputFinished = Promise.resolve()
    if (mode === 'dump') {
      const output = createWriteStream(filePath)
      const source = gz ? child.stdout.pipe(createGzip()) : child.stdout
      source.pipe(output)
      outputFinished = new Promise<void>((done, fail) => { output.on('finish', done); output.on('error', fail) })
    } else {
      const input = createReadStream(filePath)
      const source = gz ? input.pipe(createGunzip()) : input
      source.pipe(child.stdin)
      input.on('error', reject)
    }
    child.on('error', reject)
    child.on('close', async (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || `Database command exited with code ${code}`))
      try { await outputFinished; resolve() } catch (error) { reject(error) }
    })
  })
}

async function listSnapshots(root: string): Promise<AuroraSnapshot[]> {
  const dir = snapshotsDir(root)
  await mkdir(dir, { recursive: true })
  const files = (await readdir(dir)).filter((name) => name.endsWith('.sql.gz'))
  const rows = await Promise.all(files.map(async (name) => ({ Name: name.replace(/\.sql\.gz$/, ''), Created: (await stat(join(dir, name))).mtime.toISOString() })))
  return rows.sort((a, b) => b.Created.localeCompare(a.Created))
}

export function registerDatabaseIpc():void {
  ipcMain.handle('database:listSnapshots', (_event, _name: string, root: string) => listSnapshots(root))
  ipcMain.handle('database:createSnapshot', async (_event, _operationId: string, root: string, name?: string) => {
    const config = await getProjectConfigByRoot(root); await mkdir(snapshotsDir(root), { recursive: true })
    await runDatabasePipe(root, config.database, 'dump', join(snapshotsDir(root), `${safeSnapshotName(name)}.sql.gz`))
  })
  ipcMain.handle('database:restoreSnapshot', async (_event, _operationId: string, root: string, name: string) => {
    const config = await getProjectConfigByRoot(root); await runDatabasePipe(root, config.database, 'restore', join(snapshotsDir(root), `${safeSnapshotName(name)}.sql.gz`))
  })
  ipcMain.handle('database:deleteSnapshot', async (_event, _operationId: string, root: string, name: string) => rm(join(snapshotsDir(root), `${safeSnapshotName(name)}.sql.gz`), { force: true }))
  ipcMain.handle('database:importFile', async (_event, _operationId: string, root: string, filePath: string) => { const config = await getProjectConfigByRoot(root); await runDatabasePipe(root, config.database, 'restore', filePath) })
  ipcMain.handle('database:exportFile', async (_event, _operationId: string, root: string, filePath: string) => { const config = await getProjectConfigByRoot(root); await runDatabasePipe(root, config.database, 'dump', filePath) })
  ipcMain.handle('database:pickImportFile', async () => { const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'SQL dumps',extensions:['sql','gz']}]}); return r.canceled?null:r.filePaths[0] })
  ipcMain.handle('database:pickExportPath', async (_e,name:string) => { const r=await dialog.showSaveDialog({defaultPath: basename(name).endsWith('.gz') ? name : `${name}.sql.gz`, filters:[{name:'Compressed SQL dump',extensions:['gz']},{name:'SQL dump',extensions:['sql']}]}); return r.canceled?null:r.filePath })
}
