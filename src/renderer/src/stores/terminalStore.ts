import { create } from 'zustand'

export type OperationStatus = 'running' | 'success' | 'error' | 'cancelled'

export interface TerminalOperation {
  id: string
  label: string
  lines: string[]
  status: OperationStatus
  exitCode: number | null
  startedAt: string
  finishedAt: string | null
}

interface TerminalState {
  operations: Record<string, TerminalOperation>
  activeOperationId: string | null
  isPanelOpen: boolean
  startOperation: (id: string, label: string) => void
  appendChunk: (id: string, chunk: string) => void
  finishOperation: (
    id: string,
    status: Exclude<OperationStatus, 'running'>,
    exitCode: number | null
  ) => void
  setActiveOperation: (id: string | null) => void
  setPanelOpen: (open: boolean) => void
}

export const useTerminalStore = create<TerminalState>((set) => ({
  operations: {},
  activeOperationId: null,
  isPanelOpen: false,
  startOperation: (id, label): void =>
    set((state) => ({
      operations: {
        ...state.operations,
        [id]: {
          id,
          label,
          lines: [],
          status: 'running',
          exitCode: null,
          startedAt: new Date().toISOString(),
          finishedAt: null
        }
      },
      activeOperationId: id,
      isPanelOpen: true
    })),
  appendChunk: (id, chunk): void =>
    set((state) => {
      const op = state.operations[id]
      if (!op) return state
      return {
        operations: {
          ...state.operations,
          [id]: { ...op, lines: [...op.lines, chunk] }
        }
      }
    }),
  finishOperation: (id, status, exitCode): void =>
    set((state) => {
      const op = state.operations[id]
      if (!op) return state
      return {
        operations: {
          ...state.operations,
          [id]: { ...op, status, exitCode, finishedAt: new Date().toISOString() }
        }
      }
    }),
  setActiveOperation: (id): void => set({ activeOperationId: id }),
  setPanelOpen: (open): void => set({ isPanelOpen: open })
}))
