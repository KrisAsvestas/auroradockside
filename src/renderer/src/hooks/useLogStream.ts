import { useEffect, useRef, useState } from 'react'

interface LogLine {
  stream: 'stdout' | 'stderr'
  text: string
}

interface UseLogStreamResult {
  lines: LogLine[]
  isStreaming: boolean
}

// Owns the lifecycle of a single `Aurora logs -f` subprocess for one
// (name, service) pair. Callers must remount this (e.g. `key={service}`)
// when the service changes — state resets via fresh useState initializers
// on mount rather than manual resets inside the effect, since React's
// hooks lint flags synchronous setState-to-reset calls in an effect body.
// Always stops the subprocess on unmount so a closed log viewer doesn't
// leave an orphaned `Aurora logs -f` process running.
export function useLogStream(name: string, service: string): UseLogStreamResult {
  const [lines, setLines] = useState<LogLine[]>([])
  const [isStreaming, setIsStreaming] = useState(true)
  // Data arrives as arbitrary byte chunks, not newline-delimited — a chunk
  // can span partial lines or bundle many lines together. Buffer per stream
  // so filtering/display operates on real lines instead of raw chunks.
  const buffers = useRef({ stdout: '', stderr: '' })

  useEffect(() => {
    const operationId = crypto.randomUUID()
    buffers.current = { stdout: '', stderr: '' }

    const unsubData = window.api.logs.onData((event) => {
      if (event.operationId !== operationId) return
      const combined = buffers.current[event.stream] + event.chunk
      const parts = combined.split('\n')
      buffers.current[event.stream] = parts.pop() ?? ''
      if (parts.length === 0) return
      setLines((prev) => [...prev, ...parts.map((text) => ({ stream: event.stream, text }))])
    })
    const unsubExit = window.api.logs.onExit((event) => {
      if (event.operationId !== operationId) return
      setIsStreaming(false)
    })

    window.api.logs.start(operationId, name, service)

    return () => {
      unsubData()
      unsubExit()
      window.api.terminal.cancel(operationId)
    }
  }, [name, service])

  return { lines, isStreaming }
}
