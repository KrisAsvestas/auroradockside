import { app } from 'electron'
import electronUpdater, { type AppUpdater } from 'electron-updater'
import {
  getAvailableModulePackages,
  getModuleRegistry,
  installModulePackage
} from './moduleRegistry'

function updater(): AppUpdater {
  // electron-updater is CommonJS; destructuring its default import keeps the
  // production bundle compatible with Electron's ESM interop.
  return electronUpdater.autoUpdater
}

export function compareVersions(left: string, right: string): number {
  const a = left.split(/[.-]/).map((part) => Number(part) || 0)
  const b = right.split(/[.-]/).map((part) => Number(part) || 0)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) - (b[index] ?? 0)
  }
  return 0
}

export async function updateInstalledModulesFromCatalog(): Promise<string[]> {
  const installed = new Map((await getModuleRegistry()).map((module) => [module.id, module]))
  const available = await getAvailableModulePackages()
  const updated: string[] = []

  for (const candidate of available) {
    const current = installed.get(candidate.manifest.id)
    if (!current || compareVersions(candidate.manifest.version, current.version) <= 0) continue
    await installModulePackage(candidate.sourcePath)
    updated.push(`${candidate.manifest.name} ${candidate.manifest.version}`)
  }

  return updated
}

export function startAutomaticUpdates(): void {
  void updateInstalledModulesFromCatalog()
    .then((updated) => {
      if (updated.length) console.info(`Updated Aurora modules: ${updated.join(', ')}`)
    })
    .catch((error) => console.warn('Aurora module update check failed:', error))

  // electron-updater needs a packaged application and release metadata. The
  // extracted development build intentionally skips the remote app check.
  if (!app.isPackaged || process.env.AURORA_DISABLE_AUTO_UPDATE === '1') return

  const autoUpdater = updater()
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = true
  autoUpdater.logger = console
  void autoUpdater.checkForUpdatesAndNotify().catch((error) =>
    console.warn('Aurora application update check failed:', error)
  )
}
