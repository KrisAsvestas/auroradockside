import { ipcMain } from 'electron'
import { getRuntimeStatus } from '../nativeRuntime'

export function registerRuntimeIpc(): void {
  ipcMain.handle('runtime:status', () => getRuntimeStatus())
}
