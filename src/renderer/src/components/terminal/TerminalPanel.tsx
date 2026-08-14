import { useEffect, useRef, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { useTerminalStore } from '../../stores/terminalStore'

export function TerminalPanel(): React.JSX.Element | null {
  const isPanelOpen = useTerminalStore((s) => s.isPanelOpen)
  const activeOperationId = useTerminalStore((s) => s.activeOperationId)
  const operation = useTerminalStore((s) =>
    s.activeOperationId ? s.operations[s.activeOperationId] : null
  )
  const setPanelOpen = useTerminalStore((s) => s.setPanelOpen)
  const setActiveOperation = useTerminalStore((s) => s.setActiveOperation)
  const operationMap = useTerminalStore((s) => s.operations)
  const operations = Object.values(operationMap)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [operation?.lines.length])

  if (!isPanelOpen || !activeOperationId || !operation) return null

  const copyDiagnosticLog = async (): Promise<void> => {
    const report = [
      'Aurora Dockside diagnostic log',
      `Operation: ${operation.label}`,
      `Status: ${operation.status}`,
      `Exit code: ${operation.exitCode ?? 'not finished'}`,
      `Started: ${operation.startedAt}`,
      `Finished: ${operation.finishedAt ?? 'not finished'}`,
      '',
      operation.lines.join('').trimEnd()
    ].join('\n')
    await navigator.clipboard.writeText(report)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex h-64 flex-shrink-0 flex-col border-t border-cyan-500/20 bg-neutral-950 shadow-[0_-16px_40px_rgba(15,23,42,0.2)] dark:border-cyan-400/20">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <select
            aria-label="Diagnostic operation"
            value={activeOperationId}
            onChange={(event) => setActiveOperation(event.target.value)}
            className="max-w-sm truncate rounded border border-white/10 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
          >
            {operations.slice().reverse().map((item) => (
              <option key={item.id} value={item.id}>{item.label} — {item.status}</option>
            ))}
          </select>
          <span className={operation.status === 'error' ? 'text-xs text-red-400' : 'text-xs text-neutral-400'}>
            {operation.status}{operation.exitCode !== null ? ` · exit ${operation.exitCode}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void copyDiagnosticLog()}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-neutral-300 transition hover:bg-white/10 hover:text-white"
            title="Copy complete diagnostic log"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy logs'}
          </button>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="rounded p-1 text-neutral-400 transition hover:bg-white/10 hover:text-neutral-200"
            title="Close logs"
          >
            <X size={14} />
          </button>
        </div>
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
