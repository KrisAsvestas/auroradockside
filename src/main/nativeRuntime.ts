import { app, dialog } from 'electron'
import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { access, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm } from 'fs/promises'
import { basename, isAbsolute, join, resolve, sep } from 'path'
import { promisify } from 'util'
import type { AuroraNativeRuntimeManifest, AuroraRuntimeStatus } from '../shared/types'

const execFileAsync = promisify(execFile)
const supportedPlatforms = new Set(['linux', 'darwin', 'win32'])
const supportedArchitectures = new Set(['x64', 'arm64'])
const componentIds = new Set([
  'php',
  'nginx',
  'apache',
  'mariadb',
  'mariadb-client',
  'mariadb-dump',
  'mysql',
  'postgres',
  'node',
  'composer',
  'wp-cli',
  'drush',
  'adminer'
])

export function validateNativeRuntimeManifest(value: unknown): AuroraNativeRuntimeManifest {
  if (!value || typeof value !== 'object') throw new Error('Runtime manifest must be an object.')
  const manifest = value as Record<string, unknown>
  if (manifest.schema !== 1) throw new Error('Unsupported native runtime manifest schema.')
  if (
    typeof manifest.runtimeVersion !== 'string' ||
    !/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(manifest.runtimeVersion)
  )
    throw new Error('Invalid native runtime version.')
  if (typeof manifest.platform !== 'string' || !supportedPlatforms.has(manifest.platform))
    throw new Error('Unsupported native runtime platform.')
  if (typeof manifest.arch !== 'string' || !supportedArchitectures.has(manifest.arch))
    throw new Error('Unsupported native runtime architecture.')
  if (!Array.isArray(manifest.components) || manifest.components.length === 0)
    throw new Error('Native runtime manifest has no components.')
  const components = manifest.components.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid native runtime component.')
    const component = item as Record<string, unknown>
    if (typeof component.id !== 'string' || !componentIds.has(component.id))
      throw new Error('Unknown native runtime component.')
    if (typeof component.version !== 'string' || !component.version.trim())
      throw new Error(`Missing version for ${component.id}.`)
    if (
      typeof component.executable !== 'string' ||
      !component.executable ||
      isAbsolute(component.executable) ||
      component.executable.split(/[\\/]/).includes('..')
    )
      throw new Error(`Unsafe executable path for ${component.id}.`)
    if (typeof component.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(component.sha256))
      throw new Error(`Invalid checksum for ${component.id}.`)
    return component as unknown as AuroraNativeRuntimeManifest['components'][number]
  })
  return {
    schema: 1,
    runtimeVersion: manifest.runtimeVersion,
    platform: manifest.platform as AuroraNativeRuntimeManifest['platform'],
    arch: manifest.arch as AuroraNativeRuntimeManifest['arch'],
    components
  }
}

export function runtimeRoot(): string {
  return join(app.getPath('userData'), 'runtimes', `${process.platform}-${process.arch}`)
}

async function sha256(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.once('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.once('end', () => resolve(hash.digest('hex')))
  })
}

async function verifyRuntimeAt(root: string): Promise<AuroraNativeRuntimeManifest> {
  const manifest = validateNativeRuntimeManifest(
    JSON.parse(await readFile(join(root, 'runtime.json'), 'utf8'))
  )
  if (manifest.platform !== process.platform || manifest.arch !== process.arch)
    throw new Error(
      `This runtime targets ${manifest.platform}-${manifest.arch}, not ${process.platform}-${process.arch}.`
    )
  const canonicalRoot = resolve(root)
  for (const component of manifest.components) {
    const executable = resolve(root, component.executable)
    if (executable !== canonicalRoot && !executable.startsWith(`${canonicalRoot}${sep}`))
      throw new Error(`Unsafe executable path for ${component.id}.`)
    await access(executable)
    if ((await sha256(executable)) !== component.sha256.toLowerCase())
      throw new Error(`Checksum verification failed for ${component.id}.`)
  }
  return manifest
}

async function rejectLinks(root: string, current = root): Promise<void> {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name)
    const stat = await lstat(path)
    if (stat.isSymbolicLink())
      throw new Error(`Runtime archive contains a symbolic link: ${path.slice(root.length + 1)}`)
    if (stat.isDirectory()) await rejectLinks(root, path)
  }
}

export function validateArchiveEntries(output: string): void {
  const entries = output.split(/\r?\n/).filter(Boolean)
  if (!entries.length || entries.length > 50000)
    throw new Error('Runtime archive has an invalid file count.')
  for (const entry of entries) {
    const normalized = entry.replace(/^\.\//, '')
    if (!normalized || isAbsolute(normalized) || normalized.split('/').includes('..'))
      throw new Error(`Unsafe runtime archive entry: ${entry}`)
  }
}

export async function installNativeRuntimeArchive(source: string): Promise<AuroraRuntimeStatus> {
  if (!source.endsWith('.tar.gz'))
    throw new Error('Aurora Native runtimes must be .tar.gz archives.')
  const runtimes = join(app.getPath('userData'), 'runtimes')
  await mkdir(runtimes, { recursive: true })
  const staging = await mkdtemp(join(runtimes, '.install-'))
  const target = runtimeRoot()
  const backup = `${target}.previous`
  try {
    const { stdout } = await execFileAsync('tar', ['-tzf', source], { maxBuffer: 16 * 1024 * 1024 })
    validateArchiveEntries(stdout)
    await execFileAsync(
      'tar',
      [
        '-xzf',
        source,
        ...(process.platform === 'win32' ? [] : ['--no-same-owner', '--no-same-permissions']),
        '-C',
        staging
      ],
      { maxBuffer: 16 * 1024 * 1024 }
    )
    await rejectLinks(staging)
    await verifyRuntimeAt(staging)
    await rm(backup, { recursive: true, force: true })
    try {
      await rename(target, backup)
    } catch {
      /* first installation */
    }
    try {
      await rename(staging, target)
      await rm(backup, { recursive: true, force: true })
    } catch (error) {
      try {
        await rename(backup, target)
      } catch {
        /* no previous runtime */
      }
      throw error
    }
    return getRuntimeStatus()
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

export async function pickAndInstallNativeRuntime(): Promise<AuroraRuntimeStatus | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Aurora Native Runtime', extensions: ['gz'] }]
  })
  return result.canceled || !result.filePaths[0]
    ? null
    : installNativeRuntimeArchive(result.filePaths[0])
}

export async function installBundledNativeRuntime(): Promise<AuroraRuntimeStatus> {
  const directory = join(process.resourcesPath, 'native-runtime')
  const expected = `aurora-native-0.1.0-${process.platform === 'win32' ? 'win32' : process.platform}-${process.arch}.tar.gz`
  const candidates = await readdir(directory)
  const archive =
    candidates.find((entry) => entry === expected) ??
    candidates.find((entry) => entry.endsWith(`-${process.platform}-${process.arch}.tar.gz`))
  if (!archive)
    throw new Error(
      `No bundled Aurora Native runtime is available for ${process.platform}-${process.arch}.`
    )
  return installNativeRuntimeArchive(join(directory, basename(archive)))
}

export async function ensureBundledNativeRuntime(): Promise<void> {
  if ((await nativeStatus()).available) return
  try {
    await installBundledNativeRuntime()
  } catch (error) {
    // Development builds and platforms without a packaged target keep the manual installer available.
    console.warn('Aurora Native bundled runtime was not installed:', error)
  }
}

async function nativeStatus(): Promise<AuroraRuntimeStatus['native']> {
  if (!supportedPlatforms.has(process.platform) || !supportedArchitectures.has(process.arch))
    return {
      available: false,
      platform: process.platform,
      arch: process.arch,
      components: [],
      reason: 'This platform does not have an Aurora Native runtime target yet.'
    }
  const root = runtimeRoot()
  try {
    const manifest = await verifyRuntimeAt(root)
    return {
      available: true,
      platform: process.platform,
      arch: process.arch,
      runtimeVersion: manifest.runtimeVersion,
      components: manifest.components
    }
  } catch (error) {
    return {
      available: false,
      platform: process.platform,
      arch: process.arch,
      components: [],
      reason:
        error instanceof Error && !error.message.includes('ENOENT')
          ? error.message
          : 'Aurora Native runtime is not installed yet.'
    }
  }
}

async function containerStatus(): Promise<AuroraRuntimeStatus['container']> {
  for (const provider of ['docker', 'podman'] as const) {
    try {
      const { stdout } = await execFileAsync(provider, ['--version'], { timeout: 5000 })
      return { available: true, provider, version: stdout.trim() }
    } catch {
      /* try next provider */
    }
  }
  return { available: false, provider: null, reason: 'Docker or Podman was not detected.' }
}

export async function getRuntimeStatus(): Promise<AuroraRuntimeStatus> {
  const [container, native] = await Promise.all([containerStatus(), nativeStatus()])
  return { selectedEngine: native.available ? 'native' : 'container', container, native }
}
