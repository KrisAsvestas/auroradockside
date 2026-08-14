import { dialog, ipcMain } from 'electron'
import { getProjectRoot, listInstalledModules, listModules, scaffoldApplicationModule, setModule } from '../auroraEngine'
import { runCommandStreamed } from '../commandRunner'
import { getAvailableModulePackages, installModulePackage, uninstallModulePackage } from '../moduleRegistry'

export function registerModulesIpc(): void {
  ipcMain.handle('modules:listRegistry', () => listModules())
  ipcMain.handle('modules:listAvailable', () => getAvailableModulePackages())
  ipcMain.handle('modules:pickAndInstallPackage', async () => {
    const picked = await dialog.showOpenDialog({
      properties: ['openFile', 'openDirectory'],
      filters: [{ name: 'Aurora module packages', extensions: ['pac'] }]
    })
    if (picked.canceled || !picked.filePaths[0]) return null
    return installModulePackage(picked.filePaths[0])
  })
  ipcMain.handle('modules:installPackage', (_event, source: string) => installModulePackage(source))
  ipcMain.handle('modules:uninstallPackage', (_event, id: string) => uninstallModulePackage(id))
  ipcMain.handle('modules:listInstalled', (_event, name: string) => listInstalledModules(name))
  ipcMain.handle(
    'modules:install',
    async (
      event,
      operationId: string,
      name: string,
      moduleId: string,
      settings: Record<string, string | number | boolean>
    ) => {
      await setModule(name, moduleId, true, settings)
      await scaffoldApplicationModule(name, moduleId)
      const root = await getProjectRoot(name)
      return runCommandStreamed(
        operationId,
        'docker',
        ['compose', '-f', `${root}/.aurora/compose.yaml`, 'up', '-d', '--remove-orphans'],
        event.sender,
        { cwd: root }
      )
    }
  )
  ipcMain.handle(
    'modules:remove',
    async (event, operationId: string, name: string, moduleId: string) => {
      await setModule(name, moduleId, false)
      const root = await getProjectRoot(name)
      return runCommandStreamed(
        operationId,
        'docker',
        ['compose', '-f', `${root}/.aurora/compose.yaml`, 'up', '-d', '--remove-orphans'],
        event.sender,
        { cwd: root }
      )
    }
  )
}
