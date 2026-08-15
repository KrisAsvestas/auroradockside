import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import type { AuroraRemoteSiteProfile, AuroraRemoteSiteStatus } from '@shared/types'
import { useStatusStore } from '../stores/statusStore'
import { useTerminalStore } from '../stores/terminalStore'

const key = (root: string): readonly [string, string] => ['remote-site', root] as const

export function useRemoteSiteProfile(name: string, root: string): UseQueryResult<AuroraRemoteSiteProfile | null, Error> {
  return useQuery({ queryKey: key(root), queryFn: () => window.api.remote.getProfile(name) })
}

export function useSaveRemoteSite(name: string, root: string): UseMutationResult<void, Error, AuroraRemoteSiteProfile> {
  const client = useQueryClient()
  return useMutation({ mutationFn: (profile) => window.api.remote.saveProfile(name, profile), onSuccess: () => client.invalidateQueries({ queryKey: key(root) }) })
}

export function useTestRemoteSite(name: string, root: string): UseMutationResult<AuroraRemoteSiteStatus, Error, AuroraRemoteSiteProfile> {
  const client = useQueryClient()
  return useMutation({ mutationFn: (profile) => window.api.remote.test(name, profile), onSuccess: () => client.invalidateQueries({ queryKey: key(root) }) })
}

export function usePullRemoteSite(name: string): UseMutationResult<void, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const operationId = crypto.randomUUID()
      const label = `Pull ${name} from remote`
      useTerminalStore.getState().startOperation(operationId, label)
      useStatusStore.getState().begin(operationId, label)
      await window.api.remote.pull(operationId, name)
    }
  })
}
