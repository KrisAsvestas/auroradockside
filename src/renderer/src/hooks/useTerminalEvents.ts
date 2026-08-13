import { useEffect } from 'react'
import { useTerminalStore } from '../stores/terminalStore'
import { useStatusStore } from '../stores/statusStore'
import { useToastStore } from '../stores/toastStore'

// Wires the main process's terminal:data / terminal:exit IPC events into the
// terminal/status/toast stores. Mount once near the app root — every
// long-running Aurora command (start/stop/restart, and later snapshots/addons)
// flows through this same event stream regardless of which mutation kicked
// it off, so this is the single place that owns "what happens when a
// command finishes."
export function useTerminalEvents(): void {
  useEffect(() => {
    const unsubData = window.api.terminal.onData(({ operationId, chunk }) => {
      useTerminalStore.getState().appendChunk(operationId, chunk)
    })

    const unsubExit = window.api.terminal.onExit(({ operationId, exitCode, cancelled }) => {
      const op = useTerminalStore.getState().operations[operationId]
      const status = cancelled ? 'cancelled' : exitCode === 0 ? 'success' : 'error'
      useTerminalStore.getState().finishOperation(operationId, status, exitCode)

      if (useStatusStore.getState().operationId === operationId) {
        useStatusStore.getState().end()
      }

      if (op) {
        if (status === 'success') {
          useToastStore.getState().addToast('success', `${op.label} succeeded`)
        } else if (status === 'error') {
          useToastStore.getState().addToast('error', `${op.label} failed`)
        }
      }
    })

    return () => {
      unsubData()
      unsubExit()
    }
  }, [])
}
