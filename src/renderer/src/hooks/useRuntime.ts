import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { AuroraRuntimeStatus } from '@shared/types'

export function useRuntimeStatus(): UseQueryResult<AuroraRuntimeStatus, Error> {
  return useQuery({
    queryKey: ['runtime', 'status'],
    queryFn: () => window.api.runtime.status(),
    staleTime: 30000
  })
}
