import { ipcMain } from 'electron'
import {
  getRuntimeStatus,
  installBundledNativeRuntime,
  pickAndInstallNativeRuntime
} from '../nativeRuntime'
import { getRuntimeUpdates } from '../runtimeCatalog'

export function registerRuntimeIpc(): void {
  ipcMain.handle('runtime:status', () => getRuntimeStatus())
  ipcMain.handle('runtime:updates', async () => {
    const status = await getRuntimeStatus()
    return getRuntimeUpdates(status.native.components)
  })
  ipcMain.handle('runtime:installBundled', () => installBundledNativeRuntime())
  ipcMain.handle('runtime:pickAndInstall', () => pickAndInstallNativeRuntime())
}
