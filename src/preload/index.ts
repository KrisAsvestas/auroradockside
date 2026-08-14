import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AuroraInstalledModule,
  AuroraAvailableModule,
  AuroraModuleInstallResult,
  AuroraModuleManifest,
  AuroraProjectDetail,
  AuroraProjectSummary,
  AuroraSnapshot,
  AuroraSiteCredentials,
  AuroraStackOptions,
  EnvironmentUpdate,
  LogDataEvent,
  LogExitEvent,
  TerminalDataEvent,
  TerminalExitEvent
} from '../shared/types'

// Custom APIs for renderer
const api = {
  projects: {
    list: (): Promise<AuroraProjectSummary[]> => ipcRenderer.invoke('projects:list'),
    describe: (name: string): Promise<AuroraProjectDetail> =>
      ipcRenderer.invoke('projects:describe', name),
    start: (operationId: string, name: string): Promise<void> =>
      ipcRenderer.invoke('projects:start', operationId, name),
    stop: (operationId: string, name: string): Promise<void> =>
      ipcRenderer.invoke('projects:stop', operationId, name),
    restart: (operationId: string, name: string): Promise<void> =>
      ipcRenderer.invoke('projects:restart', operationId, name),
    delete: (
      operationId: string,
      name: string,
      approot: string,
      deleteFiles: boolean
    ): Promise<void> =>
      ipcRenderer.invoke('projects:delete', operationId, name, approot, deleteFiles),
    updateEnvironment: (
      operationId: string,
      name: string,
      approot: string,
      updates: EnvironmentUpdate
    ): Promise<void> =>
      ipcRenderer.invoke('projects:updateEnvironment', operationId, name, approot, updates),
    trustCA: (): Promise<void> => ipcRenderer.invoke('projects:trustCA'),
    restartService: (operationId: string, name: string, service: string): Promise<void> =>
      ipcRenderer.invoke('projects:restartService', operationId, name, service),
    phpInfo: (operationId: string, name: string): Promise<void> =>
      ipcRenderer.invoke('projects:phpInfo', operationId, name),
    openTerminal: (name: string): Promise<void> => ipcRenderer.invoke('projects:openTerminal', name)
  },
  terminal: {
    cancel: (operationId: string): Promise<boolean> =>
      ipcRenderer.invoke('terminal:cancel', operationId),
    onData: (callback: (event: TerminalDataEvent) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, data: TerminalDataEvent): void => callback(data)
      ipcRenderer.on('terminal:data', listener)
      return () => ipcRenderer.removeListener('terminal:data', listener)
    },
    onExit: (callback: (event: TerminalExitEvent) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, data: TerminalExitEvent): void => callback(data)
      ipcRenderer.on('terminal:exit', listener)
      return () => ipcRenderer.removeListener('terminal:exit', listener)
    }
  },
  database: {
    listSnapshots: (name: string, approot: string): Promise<AuroraSnapshot[]> =>
      ipcRenderer.invoke('database:listSnapshots', name, approot),
    createSnapshot: (operationId: string, approot: string, snapshotName?: string): Promise<void> =>
      ipcRenderer.invoke('database:createSnapshot', operationId, approot, snapshotName),
    restoreSnapshot: (operationId: string, approot: string, snapshotName: string): Promise<void> =>
      ipcRenderer.invoke('database:restoreSnapshot', operationId, approot, snapshotName),
    deleteSnapshot: (operationId: string, approot: string, snapshotName: string): Promise<void> =>
      ipcRenderer.invoke('database:deleteSnapshot', operationId, approot, snapshotName),
    importFile: (operationId: string, approot: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke('database:importFile', operationId, approot, filePath),
    exportFile: (operationId: string, approot: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke('database:exportFile', operationId, approot, filePath),
    pickImportFile: (): Promise<string | null> => ipcRenderer.invoke('database:pickImportFile'),
    pickExportPath: (defaultFileName: string): Promise<string | null> =>
      ipcRenderer.invoke('database:pickExportPath', defaultFileName)
  },
  modules: {
    listRegistry: (): Promise<AuroraModuleManifest[]> => ipcRenderer.invoke('modules:listRegistry'),
    listAvailable: (): Promise<AuroraAvailableModule[]> => ipcRenderer.invoke('modules:listAvailable'),
    listInstalled: (name: string): Promise<AuroraInstalledModule[]> =>
      ipcRenderer.invoke('modules:listInstalled', name),
    pickAndInstallPackage: (): Promise<AuroraModuleInstallResult | null> =>
      ipcRenderer.invoke('modules:pickAndInstallPackage'),
    installPackage: (source: string): Promise<AuroraModuleInstallResult> =>
      ipcRenderer.invoke('modules:installPackage', source),
    uninstallPackage: (id: string): Promise<void> => ipcRenderer.invoke('modules:uninstallPackage', id),
    install: (
      operationId: string,
      name: string,
      moduleId: string,
      settings: Record<string, string | number | boolean>
    ): Promise<void> => ipcRenderer.invoke('modules:install', operationId, name, moduleId, settings),
    remove: (operationId: string, name: string, moduleId: string): Promise<void> =>
      ipcRenderer.invoke('modules:remove', operationId, name, moduleId)
  },
  logs: {
    start: (operationId: string, name: string, service: string): Promise<void> =>
      ipcRenderer.invoke('logs:start', operationId, name, service),
    onData: (callback: (event: LogDataEvent) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, data: LogDataEvent): void => callback(data)
      ipcRenderer.on('logs:data', listener)
      return () => ipcRenderer.removeListener('logs:data', listener)
    },
    onExit: (callback: (event: LogExitEvent) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, data: LogExitEvent): void => callback(data)
      ipcRenderer.on('logs:exit', listener)
      return () => ipcRenderer.removeListener('logs:exit', listener)
    }
  },
  create: {
    pickDirectory: (): Promise<string | null> => ipcRenderer.invoke('create:pickDirectory'),
    configure: (
      operationId: string,
      directory: string,
      projectName: string,
      projectType: string,
      docroot: string,
      stack?: Partial<AuroraStackOptions>
    ): Promise<void> =>
      ipcRenderer.invoke(
        'create:configure',
        operationId,
        directory,
        projectName,
        projectType,
        docroot,
        stack
      ),
    runModuleProjectCreate: (operationId: string, moduleId: string, directory: string, projectName: string, settings: Record<string, string | number | boolean>): Promise<void> =>
      ipcRenderer.invoke('create:runModuleProjectCreate', operationId, moduleId, directory, projectName, settings),
  },
  secrets: {
    getSiteCredentials: (approot: string): Promise<AuroraSiteCredentials | null> =>
      ipcRenderer.invoke('secrets:getSiteCredentials', approot)
  },
  zoom: {
    in: (): Promise<number> => ipcRenderer.invoke('window:zoomIn'),
    out: (): Promise<number> => ipcRenderer.invoke('window:zoomOut'),
    reset: (): Promise<number> => ipcRenderer.invoke('window:zoomReset')
  }
}

export type Api = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
