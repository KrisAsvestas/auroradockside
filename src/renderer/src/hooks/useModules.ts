import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import type { AuroraAvailableModule, AuroraInstalledModule, AuroraModuleManifest } from '@shared/types'
import { useTerminalStore } from '../stores/terminalStore'
import { useStatusStore } from '../stores/statusStore'

const installedModulesKey = (name: string): readonly [string, string, string] => ['modules', 'installed', name] as const

export function useModuleRegistry(): UseQueryResult<AuroraModuleManifest[], Error> {
  return useQuery({ queryKey: ['modules', 'registry'], queryFn: () => window.api.modules.listRegistry() })
}

export function useAvailableModules(): UseQueryResult<AuroraAvailableModule[], Error> {
  return useQuery({ queryKey: ['modules', 'available'], queryFn: () => window.api.modules.listAvailable() })
}

export function useInstallModulePackage(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => { await window.api.modules.pickAndInstallPackage() },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modules', 'registry'] })
  })
}

export function useInstallAvailableModule(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (sourcePath) => { await window.api.modules.installPackage(sourcePath) },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['modules', 'registry'] })
      await queryClient.invalidateQueries({ queryKey: ['modules', 'available'] })
    }
  })
}

export function useUninstallModulePackage(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => window.api.modules.uninstallPackage(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modules', 'registry'] })
  })
}

export function useInstalledModules(name: string): UseQueryResult<AuroraInstalledModule[], Error> {
  return useQuery({ queryKey: installedModulesKey(name), queryFn: () => window.api.modules.listInstalled(name) })
}

function beginOperation(label: string): string {
  const operationId = crypto.randomUUID()
  useTerminalStore.getState().startOperation(operationId, label)
  useStatusStore.getState().begin(operationId, label)
  return operationId
}

type InstallInput = { moduleId: string; settings?: Record<string, string | number | boolean> }

export function useInstallModule(name: string): UseMutationResult<void, Error, InstallInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ moduleId, settings = {} }) => {
      const operationId = beginOperation(`Install ${moduleId}`)
      await window.api.modules.install(operationId, name, moduleId, settings)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: installedModulesKey(name) })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

export function useRemoveModule(name: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (moduleId) => {
      const operationId = beginOperation(`Remove ${moduleId}`)
      await window.api.modules.remove(operationId, name, moduleId)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: installedModulesKey(name) })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
