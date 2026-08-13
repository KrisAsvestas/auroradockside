import { ipcMain } from 'electron'

const MIN_ZOOM = -3
const MAX_ZOOM = 5

export function registerWindowIpc(): void {
  ipcMain.handle('window:zoomIn', (event) => {
    const level = Math.min(MAX_ZOOM, event.sender.getZoomLevel() + 0.5)
    event.sender.setZoomLevel(level)
    return level
  })

  ipcMain.handle('window:zoomOut', (event) => {
    const level = Math.max(MIN_ZOOM, event.sender.getZoomLevel() - 0.5)
    event.sender.setZoomLevel(level)
    return level
  })

  ipcMain.handle('window:zoomReset', (event) => {
    event.sender.setZoomLevel(0)
    return 0
  })
}
