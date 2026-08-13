import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query'
import type { AuroraProjectDetail, AuroraProjectSummary, EnvironmentUpdate } from '@shared/types'
import { useTerminalStore } from '../stores/terminalStore'
import { useStatusStore } from '../stores/statusStore'

const PROJECTS_KEY = ['projects'] as const
const projectDetailKey = (name: string): readonly [string, string] => ['project', name] as const

export function useProjects(): UseQueryResult<AuroraProjectSummary[], Error> {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: () => window.api.projects.list(),
    refetchInterval: 5000
  })
}

export function useProjectDetail(name: string | null): UseQueryResult<AuroraProjectDetail, Error> {
  return useQuery({
    queryKey: name ? projectDetailKey(name) : ['project', 'none'],
    queryFn: () => window.api.projects.describe(name!),
    enabled: name !== null,
    retry: false,
    refetchInterval: (query) => query.state.status === 'error' ? false : 5000
  })
}

// Runs a streamed Aurora command (start/stop/restart) for a project. Generates
// the operationId here so the terminal panel and status bar can start
// tracking it before the IPC call even resolves.
function useProjectAction(
  verb: string,
  action: (operationId: string, name: string) => Promise<void>
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const operationId = crypto.randomUUID()
      const label = `${verb} ${name}`
      useTerminalStore.getState().startOperation(operationId, label)
      useStatusStore.getState().begin(operationId, label)
      await action(operationId, name)
    },
    onSettled: (_data, _error, name) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
      queryClient.invalidateQueries({ queryKey: projectDetailKey(name) })
    }
  })
}

export function useStartProject(): UseMutationResult<void, Error, string> {
  return useProjectAction('Start', (operationId, name) =>
    window.api.projects.start(operationId, name)
  )
}

export function useStopProject(): UseMutationResult<void, Error, string> {
  return useProjectAction('Stop', (operationId, name) =>
    window.api.projects.stop(operationId, name)
  )
}

export function useRestartProject(): UseMutationResult<void, Error, string> {
  return useProjectAction('Restart', (operationId, name) =>
    window.api.projects.restart(operationId, name)
  )
}

export function useDeleteProject(): UseMutationResult<
  void,
  Error,
  { name: string; approot: string; deleteFiles: boolean }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, approot, deleteFiles }) => {
      const operationId = crypto.randomUUID()
      const label = `Delete ${name}`
      useTerminalStore.getState().startOperation(operationId, label)
      useStatusStore.getState().begin(operationId, label)
      await window.api.projects.delete(operationId, name, approot, deleteFiles)
    },
    onSettled: (_data, _error, { name }) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
      queryClient.invalidateQueries({ queryKey: projectDetailKey(name) })
    }
  })
}

// Only runs `Aurora config` — the caller is expected to follow a successful
// call with useRestartProject() if the project is currently running, same
// split as useCreateProject's configure/start pair.
export function useUpdateEnvironment(): UseMutationResult<
  void,
  Error,
  { name: string; approot: string; updates: EnvironmentUpdate }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, approot, updates }) => {
      const operationId = crypto.randomUUID()
      useTerminalStore.getState().startOperation(operationId, `Update ${name} environment`)
      useStatusStore.getState().begin(operationId, `Update ${name} environment`)
      await window.api.projects.updateEnvironment(operationId, name, approot, updates)
    },
    onSettled: (_data, _error, { name }) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
      queryClient.invalidateQueries({ queryKey: projectDetailKey(name) })
    }
  })
}
