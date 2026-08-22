import { app } from 'electron'
import { execFile } from 'child_process'
import { access, readFile } from 'fs/promises'
import { isAbsolute, join, resolve, sep } from 'path'
import { promisify } from 'util'
import type { AuroraNativeRuntimeManifest, AuroraRuntimeStatus } from '../shared/types'

const execFileAsync = promisify(execFile)
const supportedPlatforms = new Set(['linux', 'darwin', 'win32'])
const supportedArchitectures = new Set(['x64', 'arm64'])
const componentIds = new Set(['php', 'nginx', 'apache', 'mariadb', 'mysql', 'postgres', 'node', 'composer', 'wp-cli', 'drush'])

export function validateNativeRuntimeManifest(value: unknown): AuroraNativeRuntimeManifest {
  if (!value || typeof value !== 'object') throw new Error('Runtime manifest must be an object.')
  const manifest = value as Record<string, unknown>
  if (manifest.schema !== 1) throw new Error('Unsupported native runtime manifest schema.')
  if (typeof manifest.runtimeVersion !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(manifest.runtimeVersion)) throw new Error('Invalid native runtime version.')
  if (typeof manifest.platform !== 'string' || !supportedPlatforms.has(manifest.platform)) throw new Error('Unsupported native runtime platform.')
  if (typeof manifest.arch !== 'string' || !supportedArchitectures.has(manifest.arch)) throw new Error('Unsupported native runtime architecture.')
  if (!Array.isArray(manifest.components) || manifest.components.length === 0) throw new Error('Native runtime manifest has no components.')
  const components = manifest.components.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid native runtime component.')
    const component = item as Record<string, unknown>
    if (typeof component.id !== 'string' || !componentIds.has(component.id)) throw new Error('Unknown native runtime component.')
    if (typeof component.version !== 'string' || !component.version.trim()) throw new Error(`Missing version for ${component.id}.`)
    if (typeof component.executable !== 'string' || !component.executable || isAbsolute(component.executable) || component.executable.split(/[\\/]/).includes('..')) throw new Error(`Unsafe executable path for ${component.id}.`)
    if (typeof component.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(component.sha256)) throw new Error(`Invalid checksum for ${component.id}.`)
    return component as unknown as AuroraNativeRuntimeManifest['components'][number]
  })
  return { schema: 1, runtimeVersion: manifest.runtimeVersion, platform: manifest.platform as AuroraNativeRuntimeManifest['platform'], arch: manifest.arch as AuroraNativeRuntimeManifest['arch'], components }
}

function runtimeRoot(): string {
  return join(app.getPath('userData'), 'runtimes', `${process.platform}-${process.arch}`)
}

async function nativeStatus(): Promise<AuroraRuntimeStatus['native']> {
  if (!supportedPlatforms.has(process.platform) || !supportedArchitectures.has(process.arch)) return { available: false, platform: process.platform, arch: process.arch, components: [], reason: 'This platform does not have an Aurora Native runtime target yet.' }
  const root = runtimeRoot()
  try {
    const manifest = validateNativeRuntimeManifest(JSON.parse(await readFile(join(root, 'runtime.json'), 'utf8')))
    if (manifest.platform !== process.platform || manifest.arch !== process.arch) throw new Error('The installed runtime targets a different platform.')
    const canonicalRoot = resolve(root)
    for (const component of manifest.components) {
      const executable = resolve(root, component.executable)
      if (executable !== canonicalRoot && !executable.startsWith(`${canonicalRoot}${sep}`)) throw new Error(`Unsafe executable path for ${component.id}.`)
      await access(executable)
    }
    return { available: true, platform: process.platform, arch: process.arch, runtimeVersion: manifest.runtimeVersion, components: manifest.components }
  } catch (error) {
    return { available: false, platform: process.platform, arch: process.arch, components: [], reason: error instanceof Error && !error.message.includes('ENOENT') ? error.message : 'Aurora Native runtime is not installed yet.' }
  }
}

async function containerStatus(): Promise<AuroraRuntimeStatus['container']> {
  for (const provider of ['docker', 'podman'] as const) {
    try {
      const { stdout } = await execFileAsync(provider, ['--version'], { timeout: 5000 })
      return { available: true, provider, version: stdout.trim() }
    } catch { /* try next provider */ }
  }
  return { available: false, provider: null, reason: 'Docker or Podman was not detected.' }
}

export async function getRuntimeStatus(): Promise<AuroraRuntimeStatus> {
  const [container, native] = await Promise.all([containerStatus(), nativeStatus()])
  return { selectedEngine: native.available ? 'native' : 'container', container, native }
}
