import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTerminalStore } from '../../stores/terminalStore'

export function TerminalPanel(): React.JSX.Element | null {
  const isPanelOpen = useTerminalStore((s) => s.isPanelOpen)
  const activeOperationId = useTerminalStore((s) => s.activeOperationId)
  const operation = useTerminalStore((s) =>
    s.activeOperationId ? s.operations[s.activeOperationId] : null
  )
  const setPanelOpen = useTerminalStore((s) => s.setPanelOpen)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [operation?.lines.length])

  if (!isPanelOpen || !activeOperationId || !operation) return null

  return (
    <div className="flex h-64 flex-shrink-0 flex-col border-t border-cyan-500/20 bg-neutral-950 shadow-[0_-16px_40px_rgba(15,23,42,0.2)] dark:border-cyan-400/20">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5">
        <span className="text-xs font-medium text-neutral-300">{operation.label}</span>
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          className="rounded p-1 text-neutral-400 transition hover:bg-white/10 hover:text-neutral-200"
        >
          <X size={14} />
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs text-neutral-200"
      >
        <pre className="whitespace-pre-wrap">{operation.lines.join('')}</pre>
      </div>
    </div>
  )
}
