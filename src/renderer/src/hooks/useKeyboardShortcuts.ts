import { useEffect } from 'react'

interface ShortcutHandlers {
  onNewProject: () => void
  onOpenSettings: () => void
}

// Global keyboard shortcuts: Cmd/Ctrl+N (new project), Cmd/Ctrl+, (settings),
// Cmd/Ctrl +/-/0 (zoom in/out/reset). Mount once near the app root.
export function useKeyboardShortcuts({ onNewProject, onOpenSettings }: ShortcutHandlers): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      switch (e.key) {
        case 'n':
          e.preventDefault()
          onNewProject()
          break
        case ',':
          e.preventDefault()
          onOpenSettings()
          break
        case '=':
        case '+':
          e.preventDefault()
          window.api.zoom.in()
          break
        case '-':
          e.preventDefault()
          window.api.zoom.out()
          break
        case '0':
          e.preventDefault()
          window.api.zoom.reset()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNewProject, onOpenSettings])
}
