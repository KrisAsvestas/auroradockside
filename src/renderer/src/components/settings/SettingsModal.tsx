import { Minus, Plus, RotateCcw, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useThemeStore, type Theme } from '../../stores/themeStore'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

const SHORTCUTS = [
  { keys: 'Cmd/Ctrl + N', action: 'New project' },
  { keys: 'Cmd/Ctrl + ,', action: 'Open settings' },
  { keys: 'Cmd/Ctrl + =', action: 'Zoom in' },
  { keys: 'Cmd/Ctrl + -', action: 'Zoom out' },
  { keys: 'Cmd/Ctrl + 0', action: 'Reset zoom' }
]

export function SettingsModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8">
      <div className="flex w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-4">
          <section>
            <h3 className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Theme
            </h3>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={clsx(
                    'flex-1 rounded-md border px-3 py-1.5 text-sm font-medium',
                    theme === t.value
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                      : 'border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Zoom
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.api.zoom.out()}
                className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <Minus size={14} /> Out
              </button>
              <button
                type="button"
                onClick={() => window.api.zoom.in()}
                className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <Plus size={14} /> In
              </button>
              <button
                type="button"
                onClick={() => window.api.zoom.reset()}
                className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Keyboard shortcuts
            </h3>
            <dl className="flex flex-col gap-1 text-sm">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between">
                  <dt className="text-neutral-500 dark:text-neutral-400">{s.action}</dt>
                  <dd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">
                    {s.keys}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
