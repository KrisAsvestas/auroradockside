import { app } from 'electron'
import { cp, lstat, mkdir, readFile, readdir, realpath, rename, rm, stat } from 'fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import type { AuroraAvailableModule, AuroraModuleInstallResult, AuroraModuleManifest, AuroraModuleSetting } from '../shared/types'

export const CORE_VERSION = '2.0.0-alpha.24'
export const MODULE_API_VERSION = '1.0.0'
let cache: AuroraModuleManifest[] | null = null

export function moduleDirectory(userData = app.getPath('userData')): string { return join(userData, 'modules') }
function validVersion(value: unknown): value is string { return typeof value === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value) }
function compatible(range: string, version: string): boolean {
  if (range === '*' || range === version) return true
  const major = version.split('.')[0]
  return range === `^${major}.0.0` || range.split(/\s+/).includes(version)
}
function validateSettings(value: unknown, field: string): asserts value is AuroraModuleSetting[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`)
  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error(`${field} entries must be objects`)
    const setting = item as Record<string, unknown>
    if (typeof setting.id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(setting.id)) throw new Error(`Invalid ${field} id`)
    if (typeof setting.label !== 'string' || !['boolean', 'select', 'text', 'number'].includes(String(setting.type))) throw new Error(`Invalid ${field} entry '${setting.id}'`)
    if (setting.type === 'select' && (!Array.isArray(setting.options) || !setting.options.every((x) => typeof x === 'string'))) throw new Error(`Select setting '${setting.id}' requires string options`)
  }
}

function validateRelativePackagePath(value: unknown, field: string): void {
  if (typeof value !== 'string' || !value.trim() || isAbsolute(value)) throw new Error(`${field} must be a relative package path`)
  const normalized = value.replace(/\\/g, '/')
  if (normalized.split('/').some((part) => part === '..')) throw new Error(`${field} may not leave the module package`)
}

export function validateModuleManifest(value: unknown): AuroraModuleManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Module manifest must be an object')
  const m = value as Record<string, unknown>
  if (typeof m.id !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/.test(m.id)) throw new Error('Invalid module id')
  if (typeof m.name !== 'string' || !m.name.trim()) throw new Error('Invalid module name')
  if (!validVersion(m.version)) throw new Error('Invalid module version')
  if (!['application', 'service', 'tool'].includes(String(m.category))) throw new Error('Invalid module category')
  if (typeof m.description !== 'string') throw new Error('Invalid module description')
  for (const field of ['dependencies', 'conflicts'] as const) if (!Array.isArray(m[field]) || !(m[field] as unknown[]).every((x) => typeof x === 'string' && /^[a-z][a-z0-9-]{1,63}$/.test(x))) throw new Error(`${field} must be a module id array`)
  validateSettings(m.settings, 'settings')
  const aurora = m.aurora as Record<string, unknown> | undefined
  if (!aurora || typeof aurora.core !== 'string' || typeof aurora.moduleApi !== 'string') throw new Error('Manifest must declare aurora.core and aurora.moduleApi')
  if (!compatible(aurora.core, CORE_VERSION)) throw new Error(`Module requires Aurora Core '${aurora.core}', running '${CORE_VERSION}'`)
  if (!compatible(aurora.moduleApi, MODULE_API_VERSION)) throw new Error(`Module API '${aurora.moduleApi}' is incompatible with '${MODULE_API_VERSION}'`)
  if (m.main !== undefined) validateRelativePackagePath(m.main, 'main')
  if (m.creation && typeof m.creation === 'object') validateSettings((m.creation as Record<string, unknown>).setup ?? [], 'creation.setup')
  if (m.project !== undefined) {
    if (!m.project || typeof m.project !== 'object' || Array.isArray(m.project)) throw new Error('project must be an object')
    const project = m.project as Record<string, unknown>
    if (project.adminPath !== undefined && (typeof project.adminPath !== 'string' || !project.adminPath.startsWith('/'))) throw new Error('project.adminPath must start with /')
    if (project.actions !== undefined) {
      if (!Array.isArray(project.actions)) throw new Error('project.actions must be an array')
      for (const actionValue of project.actions) {
        const action = actionValue as Record<string, unknown>
        if (!action || typeof action !== 'object' || typeof action.id !== 'string' || typeof action.label !== 'string' || typeof action.path !== 'string' || !action.path.startsWith('/')) throw new Error('Invalid project action')
        if (action.metadataKey !== undefined && typeof action.metadataKey !== 'string') throw new Error('Invalid project action metadataKey')
        if (action.hiddenValues !== undefined && !Array.isArray(action.hiddenValues)) throw new Error('Invalid project action hiddenValues')
      }
    }
  }
  return value as AuroraModuleManifest
}

async function assertSafePackageTree(root: string): Promise<void> {
  const rootReal = await realpath(root)
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      const info = await lstat(path)
      if (info.isSymbolicLink()) throw new Error(`Module packages may not contain symbolic links: ${relative(root, path)}`)
      const resolved = await realpath(path)
      if (resolved !== rootReal && !resolved.startsWith(`${rootReal}${sep}`)) throw new Error('Unsafe module package path')
      if (entry.isDirectory()) await visit(path)
    }
  }
  await visit(root)
}

export async function getModuleRegistry(userData?: string): Promise<AuroraModuleManifest[]> {
  if (!userData && cache) return cache
  const dir = moduleDirectory(userData)
  await mkdir(dir, { recursive: true })
  const manifests: AuroraModuleManifest[] = []
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue
    try { manifests.push(validateModuleManifest(JSON.parse(await readFile(join(dir, entry.name, 'manifest.json'), 'utf8')))) } catch { /* omit damaged installations */ }
  }
  if (!userData) cache = manifests
  return manifests
}

export async function getModuleManifest(id: string): Promise<AuroraModuleManifest> {
  const module = (await getModuleRegistry()).find((item) => item.id === id)
  if (!module) throw new Error(`Required Aurora module '${id}' is not installed`)
  return module
}
export function invalidateModuleRegistry(): void { cache = null }

function catalogDirectories(): string[] {
  const configured = (process.env.AURORA_MODULE_PATH ?? '').split(process.platform === 'win32' ? ';' : ':').filter(Boolean)
  const besideImage = process.env.APPIMAGE ? [join(dirname(process.env.APPIMAGE), 'modules')] : []
  return [...configured, ...besideImage, join(process.cwd(), 'modules'), join(process.cwd(), 'packages'), join(app.getAppPath(), 'packages')]
}

export async function getAvailableModulePackages(): Promise<AuroraAvailableModule[]> {
  const found = new Map<string, AuroraAvailableModule>()
  for (const directory of catalogDirectories()) {
    try {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const sourcePath = join(directory, entry.name)
        try {
          const manifest = validateModuleManifest(JSON.parse(await readFile(join(sourcePath, 'manifest.json'), 'utf8')))
          if (!found.has(manifest.id)) found.set(manifest.id, { manifest, sourcePath })
        } catch { /* unrelated or incompatible package */ }
      }
    } catch { /* optional catalog directory */ }
  }
  return [...found.values()].sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
}

export async function installModulePackage(source: string, userData?: string): Promise<AuroraModuleInstallResult> {
  if (!isAbsolute(source)) throw new Error('Module package path must be absolute')
  if (!(await stat(source)).isDirectory()) throw new Error('Select an unpacked local module directory')
  await assertSafePackageTree(source)
  const manifest = validateModuleManifest(JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8')))
  const modules = moduleDirectory(userData)
  await mkdir(modules, { recursive: true })
  const destination = resolve(modules, manifest.id)
  if (dirname(destination) !== resolve(modules) || basename(destination) !== manifest.id) throw new Error('Unsafe module destination')
  const staging = join(modules, `.${manifest.id}-${process.pid}-${Date.now()}`)
  await cp(source, staging, { recursive: true, errorOnExist: true })
  await rm(destination, { recursive: true, force: true })
  await rename(staging, destination)
  invalidateModuleRegistry()
  return { manifest, installedPath: destination }
}

export async function uninstallModulePackage(id: string, userData?: string): Promise<void> {
  if (!/^[a-z][a-z0-9-]{1,63}$/.test(id)) throw new Error('Invalid module id')
  const modules = resolve(moduleDirectory(userData))
  const destination = resolve(modules, id)
  if (dirname(destination) !== modules) throw new Error('Unsafe module destination')
  await rm(destination, { recursive: true, force: true })
  invalidateModuleRegistry()
}
