import { Loader2, X } from 'lucide-react'
import { useStatusStore } from '../../stores/statusStore'
import { useTerminalStore } from '../../stores/terminalStore'

export function StatusBar(): React.JSX.Element {
  const operationId = useStatusStore((s) => s.operationId)
  const label = useStatusStore((s) => s.label)
  const setActiveOperation = useTerminalStore((s) => s.setActiveOperation)
  const setPanelOpen = useTerminalStore((s) => s.setPanelOpen)

  return (
    <footer className="flex h-8 flex-shrink-0 items-center justify-between border-t border-white/70 bg-white/75 px-3 text-xs text-neutral-500 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/75 dark:text-neutral-400">
      {operationId && label ? (
        <>
          <button
            type="button"
            onClick={() => {
              setActiveOperation(operationId)
              setPanelOpen(true)
            }}
            className="flex items-center gap-1.5 transition hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <Loader2 size={12} className="animate-spin" />
            {label}…
          </button>
          <button
            type="button"
            onClick={() => window.api.terminal.cancel(operationId)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10"
          >
            <X size={12} />
            Cancel
          </button>
        </>
      ) : (
        <span>Ready</span>
      )}
    </footer>
  )
}
