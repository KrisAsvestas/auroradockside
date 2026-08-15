import { dialog, ipcMain } from 'electron'
import { getProjectConfig, getProjectRoot, listInstalledModules, listModules, scaffoldApplicationModule, setModule } from '../auroraEngine'
import { runCommandStreamed } from '../commandRunner'
import { getAvailableModulePackages, installModulePackage, uninstallModulePackage } from '../moduleRegistry'
import { runModuleLifecycleHook, runModuleProjectTool } from '../moduleRuntime'

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
  ipcMain.handle('modules:uninstallPackage', async (event, operationId: string, id: string) => {
    try { await runModuleLifecycleHook(id, 'packageUninstall', { operationId, sender: event.sender }); await uninstallModulePackage(id); if (!event.sender.isDestroyed()) event.sender.send('terminal:exit', { operationId, exitCode: 0, cancelled: false }) }
    catch (error) { if (!event.sender.isDestroyed()) event.sender.send('terminal:exit', { operationId, exitCode: 1, cancelled: false }); throw error }
  })
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
      try {
        await runCommandStreamed(operationId, 'docker', ['compose', '-f', `${root}/.aurora/compose.yaml`, 'up', '-d', '--remove-orphans'], event.sender, { cwd: root, emitExit: false })
        await runModuleLifecycleHook(moduleId, 'projectCreate', { directory: root, projectName: name, settings, operationId, sender: event.sender })
        if (!event.sender.isDestroyed()) event.sender.send('terminal:exit', { operationId, exitCode: 0, cancelled: false })
      } catch (error) { if (!event.sender.isDestroyed()) event.sender.send('terminal:exit', { operationId, exitCode: 1, cancelled: false }); throw error }
    }
  )
  ipcMain.handle(
    'modules:remove',
    async (event, operationId: string, name: string, moduleId: string) => {
      const root = await getProjectRoot(name)
      try {
        const config = await getProjectConfig(root)
        await runModuleLifecycleHook(moduleId, 'projectRemove', { directory: root, projectName: name, settings: config.moduleSettings?.[moduleId], operationId, sender: event.sender })
        await setModule(name, moduleId, false)
        await runCommandStreamed(operationId, 'docker', ['compose', '-f', `${root}/.aurora/compose.yaml`, 'up', '-d', '--remove-orphans'], event.sender, { cwd: root, emitExit: false })
        if (!event.sender.isDestroyed()) event.sender.send('terminal:exit', { operationId, exitCode: 0, cancelled: false })
      } catch (error) { if (!event.sender.isDestroyed()) event.sender.send('terminal:exit', { operationId, exitCode: 1, cancelled: false }); throw error }
    }
  )
  ipcMain.handle('modules:runProjectTool', async (event, operationId: string, name: string, moduleId: string, toolId: string) => {
    const root = await getProjectRoot(name)
    return runModuleProjectTool(moduleId, toolId, operationId, root, event.sender)
  })
}
