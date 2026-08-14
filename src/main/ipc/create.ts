import { dialog, ipcMain } from 'electron'
import { createProject } from '../auroraEngine'
import { runModuleProjectCreate } from '../moduleRuntime'
import type { AuroraStackOptions } from '../../shared/types'

export function registerCreateIpc(): void {
  ipcMain.handle('create:pickDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('create:configure', (_event, _id: string, directory: string, name: string, type: string, docroot: string, stack?: Partial<AuroraStackOptions>) => createProject(directory, name, type, docroot, stack))
  ipcMain.handle('create:runModuleProjectCreate', (event, id: string, moduleId: string, directory: string, name: string, settings: Record<string, string | number | boolean>) => runModuleProjectCreate(moduleId, id, directory, name, settings, event.sender))
}
