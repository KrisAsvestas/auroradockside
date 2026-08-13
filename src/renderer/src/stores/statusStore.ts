import { create } from 'zustand'

interface StatusState {
  operationId: string | null
  label: string | null
  begin: (operationId: string, label: string) => void
  end: () => void
}

export const useStatusStore = create<StatusState>((set) => ({
  operationId: null,
  label: null,
  begin: (operationId, label): void => set({ operationId, label }),
  end: (): void => set({ operationId: null, label: null })
}))
