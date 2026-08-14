import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useLogStream } from '../../hooks/useLogStream'

function LogPane({
  name,
  service,
  filter
}: {
  name: string
  service: string
  filter: string
}): React.JSX.Element {
  const { lines, isStreaming } = useLogStream(name, service)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const filteredLines = useMemo(() => {
    if (!filter.trim()) return lines
    const q = filter.toLowerCase()
    return lines.filter((line) => line.text.toLowerCase().includes(q))
  }, [lines, filter])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [filteredLines.length])

  const copyLogs = async (): Promise<void> => {
    const report = [
      'Aurora Dockside service log',
      `Project: ${name}`,
      `Service: ${service}`,
      `Captured: ${new Date().toISOString()}`,
      '',
      ...filteredLines.map((line) => line.text)
    ].join('\n')
    await navigator.clipboard.writeText(report)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2">
        <span
          className={clsx(
            'flex items-center gap-1 text-xs',
            isStreaming ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'
          )}
        >
          <span className={clsx('h-1.5 w-1.5 rounded-full', isStreaming ? 'bg-emerald-500' : 'bg-neutral-400')} />
          {isStreaming ? 'streaming' : 'stopped'} · {filteredLines.length} lines
        </span>
        <button
          type="button"
          onClick={() => void copyLogs()}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy logs'}
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-neutral-950 px-4 py-3 font-mono text-xs text-neutral-200"
      >
        {filteredLines.length === 0 ? (
          <p className="text-neutral-500">
            {lines.length === 0 ? 'Waiting for log output…' : 'No lines match the filter.'}
          </p>
        ) : (
          <div>
            {filteredLines.map((line, i) => (
              <div
                key={i}
                className={clsx('whitespace-pre-wrap', line.stream === 'stderr' && 'text-red-400')}
              >
                {line.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function LogViewer({
  name,
  services,
  onClose
}: {
  name: string
  services: string[]
  onClose: () => void
}): React.JSX.Element {
  const [service, setService] = useState(services[0] ?? 'web')
  const [filter, setFilter] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8">
      <div className="flex h-full w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Logs — {name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          >
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs…"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>

        <LogPane key={service} name={name} service={service} filter={filter} />
      </div>
    </div>
  )
}
