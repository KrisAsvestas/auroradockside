import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query'
import type { AuroraRuntimeStatus, AuroraRuntimeUpdateStatus } from '@shared/types'

export function useRuntimeStatus(): UseQueryResult<AuroraRuntimeStatus, Error> {
  return useQuery({
    queryKey: ['runtime', 'status'],
    queryFn: () => window.api.runtime.status(),
    staleTime: 30000
  })
}

export function useInstallNativeRuntime(): UseMutationResult<
  AuroraRuntimeStatus | null,
  Error,
  'bundled' | 'file'
> {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (source) =>
      source === 'bundled'
        ? window.api.runtime.installBundled()
        : window.api.runtime.pickAndInstall(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['runtime'] })
    }
  })
}

export function useRuntimeUpdates(): UseQueryResult<AuroraRuntimeUpdateStatus, Error> {
  return useQuery({
    queryKey: ['runtime', 'updates'],
    queryFn: () => window.api.runtime.updates(),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
    retry: 1
  })
}
