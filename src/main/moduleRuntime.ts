import { createRequire } from 'module'
import { dirname, join, resolve, sep } from 'path'
import type { WebContents } from 'electron'
import { getModuleManifest, moduleDirectory } from './moduleRegistry'
import { runCommandStreamed } from './commandRunner'
import { ensureRouter, getProjectConfigByRoot, projectUrls, setProjectModuleMetadata } from './auroraEngine'
import { saveSiteCredentials } from './ipc/secrets'

type Settings = Record<string, string | number | boolean>
type ExternalHook = (context: Record<string, unknown>) => Promise<void>

export async function runModuleProjectCreate(moduleId: string, operationId: string, directory: string, projectName: string, settings: Settings, sender: WebContents): Promise<void> {
  const manifest = await getModuleManifest(moduleId)
  if (!manifest.main) return
  const root = resolve(moduleDirectory(), moduleId)
  const entry = resolve(root, manifest.main)
  if (entry !== root && !entry.startsWith(`${root}${sep}`)) throw new Error('Unsafe module main entry')
  const loaded = createRequire(join(dirname(entry), 'loader.cjs'))(entry) as { projectCreate?: ExternalHook }
  if (typeof loaded.projectCreate !== 'function') return
  const config = await getProjectConfigByRoot(directory)
  const urls = projectUrls(config.name)
  try { await loaded.projectCreate(Object.freeze({
    moduleId,
    directory,
    projectName,
    settings: Object.freeze({ ...settings }),
    urls: Object.freeze(urls),
    run: (_suffix: string, command: string, args: string[]) => runCommandStreamed(operationId, command, args, sender, { cwd: directory, emitExit: false }),
    ensureRouter,
    setProjectMetadata: (metadata: Record<string, string | number | boolean>) => setProjectModuleMetadata(directory, metadata),
    saveCredentials: (credentials: { platform: string; adminUrl: string; username: string; password: string; email: string }) => saveSiteCredentials(directory, credentials)
  }))
    if (!sender.isDestroyed()) sender.send('terminal:exit', { operationId, exitCode: 0, cancelled: false })
  } catch (error) {
    if (!sender.isDestroyed()) sender.send('terminal:exit', { operationId, exitCode: 1, cancelled: false })
    throw error
  }
}
