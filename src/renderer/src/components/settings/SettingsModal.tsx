import {
  CheckCircle2,
  Download,
  FolderArchive,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  X
} from 'lucide-react'
import { clsx } from 'clsx'
import { useThemeStore, type Theme } from '../../stores/themeStore'
import {
  useInstallNativeRuntime,
  useRuntimeStatus,
  useRuntimeUpdates
} from '../../hooks/useRuntime'
import { useToastStore } from '../../stores/toastStore'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
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
  const runtimeUpdates = useRuntimeUpdates()
  const runtimeStatus = useRuntimeStatus()
  const installRuntime = useInstallNativeRuntime()
  const addToast = useToastStore((s) => s.addToast)

  async function install(source: 'bundled' | 'file'): Promise<void> {
    try {
      const installed = await installRuntime.mutateAsync(source)
      if (installed)
        addToast('success', `Aurora Native ${installed.native.runtimeVersion} installed.`)
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Runtime installation failed.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8">
      <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-neutral-900">
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

        <div className="flex flex-col gap-6 overflow-y-auto p-4">
          <section>
            <h3 className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Aurora Native engine
            </h3>
            <div className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-700">
              <p className="font-medium">
                {runtimeStatus.data?.native.available
                  ? `Runtime ${runtimeStatus.data.native.runtimeVersion} installed`
                  : 'Runtime not installed'}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {runtimeStatus.data?.native.available
                  ? runtimeStatus.data.native.components
                      .map((item) => `${item.id} ${item.version}`)
                      .join(' · ')
                  : runtimeStatus.data?.native.reason}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={installRuntime.isPending}
                  onClick={() => void install('bundled')}
                  className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  <Download size={13} />
                  Install bundled
                </button>
                <button
                  type="button"
                  disabled={installRuntime.isPending}
                  onClick={() => void install('file')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  <FolderArchive size={13} />
                  Install from file
                </button>
              </div>
            </div>
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Runtime updates
              </h3>
              <button
                type="button"
                onClick={() => runtimeUpdates.refetch()}
                disabled={runtimeUpdates.isFetching}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-cyan-700 hover:bg-cyan-50 disabled:opacity-50 dark:text-cyan-300 dark:hover:bg-cyan-400/10"
              >
                <RefreshCw size={12} className={runtimeUpdates.isFetching ? 'animate-spin' : ''} />
                Check now
              </button>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-700">
              {runtimeUpdates.isLoading ? (
                <p className="text-neutral-500">Checking trusted runtime catalog…</p>
              ) : runtimeUpdates.data?.updates.length ? (
                <div className="space-y-2">
                  {runtimeUpdates.data.updates.map((update) => (
                    <div key={update.component} className="flex items-center justify-between">
                      <span className="font-medium uppercase">{update.component}</span>
                      <span className="text-xs text-amber-700 dark:text-amber-300">
                        {update.installedVersion} → {update.availableVersion}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  Installed Aurora runtimes are current.
                </p>
              )}
              {runtimeUpdates.data?.message && (
                <p className="mt-2 text-xs text-neutral-500">
                  Using the {runtimeUpdates.data.source} catalog. {runtimeUpdates.data.message}
                </p>
              )}
              <p className="mt-2 text-xs text-neutral-400">
                Updates are announced automatically. Installation remains a user-approved action.
              </p>
            </div>
          </section>

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
