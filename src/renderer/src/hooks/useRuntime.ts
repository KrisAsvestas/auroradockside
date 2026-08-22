import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { AuroraRuntimeStatus, AuroraRuntimeUpdateStatus } from '@shared/types'

export function useRuntimeStatus(): UseQueryResult<AuroraRuntimeStatus, Error> {
  return useQuery({
    queryKey: ['runtime', 'status'],
    queryFn: () => window.api.runtime.status(),
    staleTime: 30000
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
