import { useCallback, useState } from 'react'
import { Anchor, Boxes, FolderOpen, Plus, Settings, Sparkles, TerminalSquare } from 'lucide-react'
import { ProjectDetail } from './components/projects/ProjectDetail'
import { ProjectList } from './components/projects/ProjectList'
import { TerminalPanel } from './components/terminal/TerminalPanel'
import { StatusBar } from './components/layout/StatusBar'
import { Toaster } from './components/ui/Toaster'
import { CreateProjectModal } from './components/create/CreateProjectModal'
import { SettingsModal } from './components/settings/SettingsModal'
import { GlobalModuleManager } from './components/modules/GlobalModuleManager'
import { useAppStore } from './stores/appStore'
import { useTerminalEvents } from './hooks/useTerminalEvents'
import { useAppliedTheme } from './hooks/useAppliedTheme'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import docksideIcon from './assets/dockside-icon.png'

function App(): React.JSX.Element {
  const selectedProjectName = useAppStore((s) => s.selectedProjectName)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isModulesOpen, setIsModulesOpen] = useState(false)
  useTerminalEvents()
  useAppliedTheme()
  useKeyboardShortcuts({
    onNewProject: useCallback(() => setIsCreateOpen(true), []),
    onOpenSettings: useCallback(() => setIsSettingsOpen(true), [])
  })

  return (
    <div className="flex h-screen w-screen flex-col bg-[radial-gradient(circle_at_18%_0%,rgba(6,182,212,0.10),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#f1f5f6_58%,#e9f0f2_100%)] text-neutral-900 dark:bg-[linear-gradient(135deg,rgba(45,212,191,0.10)_0%,transparent_36%),linear-gradient(180deg,#070a0f_0%,#0f172a_54%,#092f34_100%)] dark:text-neutral-100">
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 flex-shrink-0 flex-col border-r border-white/70 bg-white/[0.78] shadow-[8px_0_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.72] dark:shadow-black/25">
          <div className="flex items-center justify-between border-b border-neutral-200/70 px-4 py-3 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={docksideIcon}
                alt=""
                className="size-10 rounded-xl shadow-sm shadow-cyan-900/20"
              />
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold tracking-wide">Aurora Dockside</h1>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  Aurora modular dev platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                title="New Project"
                className="rounded-md p-1.5 text-neutral-500 transition hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-300"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
                className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-neutral-100"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ProjectList />
          </div>
          <div className="border-t border-neutral-200/70 p-2.5 dark:border-white/10">
            <button type="button" onClick={() => setIsModulesOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-cyan-50 hover:text-cyan-700 dark:text-neutral-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200"><Boxes size={16}/>Modules</button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          {selectedProjectName ? (
            <ProjectDetail name={selectedProjectName} />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="relative grid w-full max-w-3xl overflow-hidden rounded-2xl border border-white/70 bg-white/[0.84] shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.70] dark:shadow-black/30">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(8,145,178,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(8,145,178,0.08)_1px,transparent_1px)] bg-[size:34px_34px] dark:bg-[linear-gradient(rgba(45,212,191,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.08)_1px,transparent_1px)]" />
                <div className="relative grid gap-7 p-8">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                        <Sparkles size={13} />
                        Local environments, neatly handled
                      </div>
                      <h2 className="max-w-xl text-3xl font-semibold leading-tight text-neutral-950 dark:text-white">
                        Build local development stacks your way.
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        Create Docker-powered PHP and Node.js projects, then add applications, services, and tools as modules.
                      </p>
                    </div>
                    <img
                      src={docksideIcon}
                      alt=""
                      className="hidden size-24 flex-shrink-0 rounded-3xl shadow-lg shadow-cyan-900/20 sm:block"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-neutral-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                      <FolderOpen size={18} className="mb-3 text-cyan-700 dark:text-cyan-300" />
                      <p className="text-sm font-semibold">Project overview</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                        Status, stack details, paths, and services.
                      </p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                      <TerminalSquare size={18} className="mb-3 text-cyan-700 dark:text-cyan-300" />
                      <p className="text-sm font-semibold">Live operations</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                        Start, stop, restart, and inspect logs.
                      </p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                      <Anchor size={18} className="mb-3 text-cyan-700 dark:text-cyan-300" />
                      <p className="text-sm font-semibold">Database control</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                        Snapshots, imports, exports, and add-ons.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <TerminalPanel />
      <StatusBar />
      <Toaster />
      {isCreateOpen && <CreateProjectModal onClose={() => setIsCreateOpen(false)} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isModulesOpen && <GlobalModuleManager onClose={() => setIsModulesOpen(false)} />}
    </div>
  )
}

export default App
