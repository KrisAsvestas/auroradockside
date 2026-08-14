import type { AuroraStackOptions } from '@shared/types'
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useTerminalStore } from '../stores/terminalStore'
import { useStatusStore } from '../stores/statusStore'

export interface CreateProjectInput { directory: string; projectName: string; projectType: string; docroot: string; stack?: Partial<AuroraStackOptions> }

export function useCreateProject(): UseMutationResult<void, Error, CreateProjectInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ directory, projectName, projectType, docroot, stack }) => {
      const operationId = crypto.randomUUID()
      useTerminalStore.getState().startOperation(operationId, `Create project ${projectName}`)
      useStatusStore.getState().begin(operationId, `Create project ${projectName}`)
      await window.api.create.configure(operationId, directory, projectName, projectType, docroot, stack)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  })
}
