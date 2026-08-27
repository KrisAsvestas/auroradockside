import { dialog, ipcMain } from 'electron'
import { createReadStream, createWriteStream } from 'fs'
import { mkdir, readdir, rm, stat } from 'fs/promises'
import { basename, join } from 'path'
import { spawn } from 'child_process'
import { createGunzip, createGzip } from 'zlib'
import { AURORA_ENV, getProjectConfigByRoot } from '../auroraEngine'
import { startNativeProject } from '../native/nativeProject'
import { runtimeRoot } from '../nativeRuntime'
import type { AuroraSnapshot } from '../../shared/types'

const snapshotsDir = (root: string): string => join(root, '.aurora', 'snapshots')
const composeFile = (root: string): string => join(root, '.aurora', 'compose.yaml')

function safeSnapshotName(value?: string): string {
  const fallback = new Date().toISOString().replace(/[:.]/g, '-')
  const safe = (value?.trim() || fallback).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return safe || fallback
}

function dbCommand(
  type: 'mariadb' | 'mysql' | 'postgres',
  mode: 'dump' | 'restore'
): { command: string; args: string[] } {
  if (type === 'postgres') {
    return mode === 'dump'
      ? { command: 'pg_dump', args: ['-U', 'db', '-d', 'db', '--clean', '--if-exists'] }
      : { command: 'psql', args: ['-U', 'db', '-d', 'db', '-v', 'ON_ERROR_STOP=1'] }
  }
  if (type === 'mysql') {
    return mode === 'dump'
      ? {
          command: 'mysqldump',
          args: ['-udb', '-pdb', '--single-transaction', '--routines', '--triggers', 'db']
        }
      : { command: 'mysql', args: ['-udb', '-pdb', 'db'] }
  }
  return mode === 'dump'
    ? {
        command: 'mariadb-dump',
        args: ['-udb', '-pdb', '--single-transaction', '--routines', '--triggers', 'db']
      }
    : { command: 'mariadb', args: ['-udb', '-pdb', 'db'] }
}

async function runDatabasePipe(
  root: string,
  mode: 'dump' | 'restore',
  filePath: string
): Promise<void> {
  const config = await getProjectConfigByRoot(root)
  let command: string
  let args: string[]
  if (config.runtimeEngine === 'native') {
    if (!config.nativePorts) throw new Error('Native project has no allocated database port.')
    if (config.database !== 'mariadb')
      throw new Error('Aurora Native database portability currently supports MariaDB.')
    await startNativeProject({
      name: config.name,
      root,
      docroot: config.docroot,
      ports: config.nativePorts
    })
    command =
      process.platform === 'win32'
        ? join(
            runtimeRoot(),
            'bin',
            'mariadb',
            'bin',
            mode === 'dump' ? 'mariadb-dump.exe' : 'mariadb.exe'
          )
        : join(runtimeRoot(), 'bin', mode === 'dump' ? 'mariadb-dump' : 'mariadb')
    args = [
      '--host=127.0.0.1',
      `--port=${config.nativePorts.database}`,
      '--user=db',
      '--password=db',
      ...(mode === 'dump' ? ['--single-transaction', '--routines', '--triggers'] : []),
      'db'
    ]
  } else {
    const db = dbCommand(config.database, mode)
    command = 'docker'
    args = ['compose', '-f', composeFile(root), 'exec', '-T', 'db', db.command, ...db.args]
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: AURORA_ENV,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    const gz = filePath.endsWith('.gz')
    let outputFinished = Promise.resolve()
    if (mode === 'dump') {
      const output = createWriteStream(filePath)
      const source = gz ? child.stdout.pipe(createGzip()) : child.stdout
      source.pipe(output)
      outputFinished = new Promise<void>((done, fail) => {
        output.on('finish', done)
        output.on('error', fail)
      })
    } else {
      const input = createReadStream(filePath)
      const source = gz ? input.pipe(createGunzip()) : input
      source.pipe(child.stdin)
      input.on('error', reject)
    }
    child.on('error', reject)
    child.on('close', async (code) => {
      if (code !== 0)
        return reject(new Error(stderr.trim() || `Database command exited with code ${code}`))
      try {
        await outputFinished
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  })
}

async function listSnapshots(root: string): Promise<AuroraSnapshot[]> {
  const dir = snapshotsDir(root)
  await mkdir(dir, { recursive: true })
  const files = (await readdir(dir)).filter((name) => name.endsWith('.sql.gz'))
  const rows = await Promise.all(
    files.map(async (name) => ({
      Name: name.replace(/\.sql\.gz$/, ''),
      Created: (await stat(join(dir, name))).mtime.toISOString()
    }))
  )
  return rows.sort((a, b) => b.Created.localeCompare(a.Created))
}

export function registerDatabaseIpc(): void {
  ipcMain.handle('database:listSnapshots', (_event, _name: string, root: string) =>
    listSnapshots(root)
  )
  ipcMain.handle(
    'database:createSnapshot',
    async (_event, _operationId: string, root: string, name?: string) => {
      await mkdir(snapshotsDir(root), { recursive: true })
      await runDatabasePipe(
        root,
        'dump',
        join(snapshotsDir(root), `${safeSnapshotName(name)}.sql.gz`)
      )
    }
  )
  ipcMain.handle(
    'database:restoreSnapshot',
    async (_event, _operationId: string, root: string, name: string) => {
      await runDatabasePipe(
        root,
        'restore',
        join(snapshotsDir(root), `${safeSnapshotName(name)}.sql.gz`)
      )
    }
  )
  ipcMain.handle(
    'database:deleteSnapshot',
    async (_event, _operationId: string, root: string, name: string) =>
      rm(join(snapshotsDir(root), `${safeSnapshotName(name)}.sql.gz`), { force: true })
  )
  ipcMain.handle(
    'database:importFile',
    async (_event, _operationId: string, root: string, filePath: string) => {
      await runDatabasePipe(root, 'restore', filePath)
    }
  )
  ipcMain.handle(
    'database:exportFile',
    async (_event, _operationId: string, root: string, filePath: string) => {
      await runDatabasePipe(root, 'dump', filePath)
    }
  )
  ipcMain.handle('database:pickImportFile', async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'SQL dumps', extensions: ['sql', 'gz'] }]
    })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('database:pickExportPath', async (_e, name: string) => {
    const r = await dialog.showSaveDialog({
      defaultPath: basename(name).endsWith('.gz') ? name : `${name}.sql.gz`,
      filters: [
        { name: 'Compressed SQL dump', extensions: ['gz'] },
        { name: 'SQL dump', extensions: ['sql'] }
      ]
    })
    return r.canceled ? null : r.filePath
  })
}
