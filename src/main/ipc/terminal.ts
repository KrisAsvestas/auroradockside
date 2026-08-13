import { ipcMain } from 'electron'
import { cancelCommand } from '../commandRunner'

export function registerTerminalIpc(): void {
  ipcMain.handle('terminal:cancel', (_event, operationId: string) => cancelCommand(operationId))
}
