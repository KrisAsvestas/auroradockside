import { execFile } from 'child_process'
import { createRequire } from 'module'
import { mkdir } from 'fs/promises'
import { promisify } from 'util'
import { dirname, join, resolve, sep } from 'path'
import type { WebContents } from 'electron'
import type { AuroraModuleLifecycleHook } from '../shared/types'
import { getModuleManifest, moduleDirectory } from './moduleRegistry'
import { runCommandStreamed } from './commandRunner'
import {
  AURORA_ENV,
  ensureRouter,
  getNativeProjectDefinition,
  getProjectConfig,
  projectUrls,
  setProjectModuleMetadata
} from './auroraEngine'
import { startNativeProject } from './native/nativeProject'
import { runtimeRoot } from './nativeRuntime'
import { saveSiteCredentials } from './ipc/secrets'

type Settings = Record<string, string | number | boolean>
type ExternalHook = (context: Record<string, unknown>) => Promise<void> | void
type LoadedModule = Partial<Record<AuroraModuleLifecycleHook, ExternalHook>>
type HookOptions = {
  directory?: string
  projectName?: string
  settings?: Settings
  toolId?: string
  operationId?: string
  sender?: WebContents
}

const execFileAsync = promisify(execFile)
const CORE_MODULE_IDS = new Set(['adminer', 'redis', 'mailpit'])

function sendExit(sender: WebContents, operationId: string, exitCode: number): void {
  if (!sender.isDestroyed())
    sender.send('terminal:exit', { operationId, exitCode, cancelled: false })
}

function sendError(sender: WebContents, operationId: string, error: unknown): void {
  if (sender.isDestroyed()) return
  sender.send('terminal:data', {
    operationId,
    stream: 'stderr',
    chunk: `\n${error instanceof Error ? error.message : String(error)}\n`
  })
}

function loadModule(moduleId: string, main: string): LoadedModule {
  const root = resolve(moduleDirectory(), moduleId)
  const entry = resolve(root, main)
  if (entry !== root && !entry.startsWith(`${root}${sep}`))
    throw new Error('Unsafe module main entry')
  return createRequire(join(dirname(entry), 'loader.cjs'))(entry) as LoadedModule
}

export async function runModuleLifecycleHook(
  moduleId: string,
  hook: AuroraModuleLifecycleHook,
  options: HookOptions = {}
): Promise<boolean> {
  const manifest = await getModuleManifest(moduleId)
  if (!manifest.main) return false
  const handler = loadModule(moduleId, manifest.main)[hook]
  if (typeof handler !== 'function') return false
  const directory = options.directory
  const projectConfig = directory ? await getProjectConfig(directory) : undefined
  const nativeDefinition = options.projectName
    ? await getNativeProjectDefinition(options.projectName)
    : null
  const urls =
    projectConfig?.runtimeEngine === 'native' && projectConfig.nativePorts
      ? {
          http: `http://127.0.0.1:${projectConfig.nativePorts.http}`,
          https: `http://127.0.0.1:${projectConfig.nativePorts.http}`
        }
      : options.projectName
        ? projectUrls(options.projectName)
        : undefined
  const nativeTemp =
    nativeDefinition && process.platform === 'win32' ? join(runtimeRoot(), 'tmp') : undefined
  if (nativeTemp) await mkdir(nativeTemp, { recursive: true })
  const nativeCommandEnv = nativeTemp
    ? { TEMP: nativeTemp, TMP: nativeTemp, WP_CLI_CACHE_DIR: join(nativeTemp, 'wp-cli-cache') }
    : undefined
  const run = async (
    label: string,
    command: string,
    args: string[],
    env?: NodeJS.ProcessEnv
  ): Promise<void> => {
    if (options.sender && options.operationId) {
      if (!options.sender.isDestroyed())
        options.sender.send('terminal:data', {
          operationId: options.operationId,
          stream: 'stdout',
          chunk: `\n[${manifest.name}] ${label}\n`
        })
      return runCommandStreamed(options.operationId, command, args, options.sender, {
        cwd: directory ?? resolve(moduleDirectory(), moduleId),
        emitExit: false,
        env
      })
    }
    await execFileAsync(command, args, {
      cwd: directory ?? resolve(moduleDirectory(), moduleId),
      env: { ...AURORA_ENV, ...env }
    })
  }
  await handler(
    Object.freeze({
      moduleId,
      hook,
      directory,
      projectName: options.projectName,
      toolId: options.toolId,
      settings: Object.freeze({ ...(options.settings ?? {}) }),
      environment: projectConfig
        ? Object.freeze({
            php: projectConfig.php,
            node: projectConfig.node,
            webserver: projectConfig.webserver,
            database: projectConfig.database,
            databaseVersion: projectConfig.databaseVersion,
            docroot: projectConfig.docroot,
            runtimeEngine: projectConfig.runtimeEngine ?? 'container'
          })
        : undefined,
      urls: urls ? Object.freeze(urls) : undefined,
      native: nativeDefinition
        ? Object.freeze({
            phpPrefixArgs:
              process.platform === 'win32'
                ? ['-c', join(directory!, '.aurora', 'native', 'config', 'php.ini')]
                : [],
            commandEnvironment: nativeCommandEnv,
            php:
              process.platform === 'win32'
                ? join(runtimeRoot(), 'bin', 'php', 'php.exe')
                : join(runtimeRoot(), 'bin', 'php'),
            wp:
              process.platform === 'win32'
                ? join(runtimeRoot(), 'bin', 'php', 'php.exe')
                : join(runtimeRoot(), 'bin', 'wp'),
            wpPrefixArgs:
              process.platform === 'win32'
                ? [
                    '-c',
                    join(directory!, '.aurora', 'native', 'config', 'php.ini'),
                    '-d',
                    'memory_limit=512M',
                    join(runtimeRoot(), 'tools', 'wp-cli.phar')
                  ]
                : [],
            databaseHost: '127.0.0.1',
            databasePort: nativeDefinition.ports.database,
            start: () => startNativeProject(nativeDefinition)
          })
        : undefined,
      run,
      ensureRouter,
      setProjectMetadata: async (metadata: Settings) => {
        if (!directory)
          throw new Error('Project metadata is unavailable outside a project lifecycle hook')
        await setProjectModuleMetadata(directory, metadata)
      },
      saveCredentials: async (credentials: {
        platform: string
        adminUrl: string
        username: string
        password: string
        email: string
      }) => {
        if (!directory)
          throw new Error('Project credentials are unavailable outside a project lifecycle hook')
        await saveSiteCredentials(directory, credentials)
      }
    })
  )
  return true
}

export async function runProjectLifecycleHooks(
  directory: string,
  hook: 'projectStart' | 'projectRemove',
  operationId: string,
  sender: WebContents
): Promise<void> {
  const config = await getProjectConfig(directory)
  for (const moduleId of config.modules) {
    if (CORE_MODULE_IDS.has(moduleId)) continue
    await runModuleLifecycleHook(moduleId, hook, {
      directory,
      projectName: config.name,
      settings: config.moduleSettings?.[moduleId],
      operationId,
      sender
    })
  }
}

export async function runModuleProjectCreate(
  moduleId: string,
  operationId: string,
  directory: string,
  projectName: string,
  settings: Settings,
  sender: WebContents
): Promise<void> {
  try {
    await runModuleLifecycleHook(moduleId, 'projectCreate', {
      directory,
      projectName,
      settings,
      operationId,
      sender
    })
    sendExit(sender, operationId, 0)
  } catch (error) {
    sendError(sender, operationId, error)
    sendExit(sender, operationId, 1)
    throw error
  }
}

export async function runModuleProjectTool(
  moduleId: string,
  toolId: string,
  operationId: string,
  directory: string,
  sender: WebContents
): Promise<void> {
  const manifest = await getModuleManifest(moduleId)
  if (!manifest.project?.tools?.some((tool) => tool.id === toolId))
    throw new Error(`Unknown module tool '${toolId}'`)
  const config = await getProjectConfig(directory)
  if (!config.modules.includes(moduleId))
    throw new Error(`Module '${moduleId}' is not installed in this project`)
  try {
    const handled = await runModuleLifecycleHook(moduleId, 'projectTool', {
      directory,
      projectName: config.name,
      settings: config.moduleSettings?.[moduleId],
      toolId,
      operationId,
      sender
    })
    if (!handled) throw new Error(`Module '${moduleId}' does not implement projectTool`)
    sendExit(sender, operationId, 0)
  } catch (error) {
    sendError(sender, operationId, error)
    sendExit(sender, operationId, 1)
    throw error
  }
}
