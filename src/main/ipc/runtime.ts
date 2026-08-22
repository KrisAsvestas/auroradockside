import { ipcMain } from 'electron'
import { getRuntimeStatus } from '../nativeRuntime'
import { getRuntimeUpdates } from '../runtimeCatalog'

export function registerRuntimeIpc(): void {
  ipcMain.handle('runtime:status', () => getRuntimeStatus())
  ipcMain.handle('runtime:updates', async () => {
    const status = await getRuntimeStatus()
    return getRuntimeUpdates(status.native.components)
  })
}
