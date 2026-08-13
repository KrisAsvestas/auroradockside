import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query'
import type { AuroraSnapshot } from '@shared/types'
import { useTerminalStore } from '../stores/terminalStore'
import { useStatusStore } from '../stores/statusStore'

const snapshotsKey = (name: string): readonly [string, string] => ['snapshots', name] as const

export function useSnapshots(name: string, approot: string): UseQueryResult<AuroraSnapshot[], Error> {
  return useQuery({
    queryKey: snapshotsKey(name),
    queryFn: () => window.api.database.listSnapshots(name, approot)
  })
}

// Same tracked-operation pattern as useProjectAction in useAurora.ts: generate
// an operationId up front so the terminal panel/status bar pick it up before
// the (potentially slow) Aurora command resolves.
function beginOperation(label: string): string {
  const operationId = crypto.randomUUID()
  useTerminalStore.getState().startOperation(operationId, label)
  useStatusStore.getState().begin(operationId, label)
  return operationId
}

export function useCreateSnapshot(
  name: string,
  approot: string
): UseMutationResult<void, Error, string | undefined> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (snapshotName?: string) => {
      const operationId = beginOperation(`Create snapshot for ${name}`)
      await window.api.database.createSnapshot(operationId, approot, snapshotName)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: snapshotsKey(name) })
  })
}

export function useRestoreSnapshot(
  name: string,
  approot: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (snapshotName: string) => {
      const operationId = beginOperation(`Restore snapshot ${snapshotName}`)
      await window.api.database.restoreSnapshot(operationId, approot, snapshotName)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: snapshotsKey(name) })
  })
}

export function useDeleteSnapshot(
  name: string,
  approot: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (snapshotName: string) => {
      const operationId = beginOperation(`Delete snapshot ${snapshotName}`)
      await window.api.database.deleteSnapshot(operationId, approot, snapshotName)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: snapshotsKey(name) })
  })
}

// Resolves to false if the user cancels the file picker, true if the import ran.
export function useImportDatabase(
  name: string,
  approot: string
): UseMutationResult<boolean, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const filePath = await window.api.database.pickImportFile()
      if (!filePath) return false
      const operationId = beginOperation(`Import database into ${name}`)
      await window.api.database.importFile(operationId, approot, filePath)
      return true
    }
  })
}

// Resolves to false if the user cancels the save dialog, true if the export ran.
export function useExportDatabase(
  name: string,
  approot: string
): UseMutationResult<boolean, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const filePath = await window.api.database.pickExportPath(`${name}.sql.gz`)
      if (!filePath) return false
      const operationId = beginOperation(`Export database from ${name}`)
      await window.api.database.exportFile(operationId, approot, filePath)
      return true
    }
  })
}
