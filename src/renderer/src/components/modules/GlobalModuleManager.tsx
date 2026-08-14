import { Boxes, Download, RefreshCw, Trash2, X } from 'lucide-react'
import { useAvailableModules, useInstallAvailableModule, useInstallModulePackage, useModuleRegistry, useUninstallModulePackage } from '../../hooks/useModules'

function compareVersions(left: string, right: string): number {
  const a = left.split(/[.-]/).map((part) => Number(part) || 0)
  const b = right.split(/[.-]/).map((part) => Number(part) || 0)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) - (b[index] ?? 0)
  }
  return 0
}

export function GlobalModuleManager({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { data: available = [], isLoading } = useAvailableModules()
  const { data: installed = [] } = useModuleRegistry()
  const install = useInstallAvailableModule()
  const uninstall = useUninstallModulePackage()
  const installFromFolder = useInstallModulePackage()
  const installedById = new Map(installed.map((module) => [module.id, module]))

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm">
    <div className="flex max-h-[min(720px,calc(100vh-32px))] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-white/10">
        <div><h2 className="font-semibold">Modules</h2><p className="text-xs text-neutral-500 dark:text-neutral-400">Install and manage Aurora application modules.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10"><X size={17}/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? <p className="text-sm text-neutral-500">Loading available modules…</p> : available.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center dark:border-white/10"><Boxes className="mx-auto text-cyan-500"/><p className="mt-3 font-semibold">No modules found</p><p className="mt-1 text-sm text-neutral-500">Place module packages beside Aurora or choose a local package folder.</p></div> : <div className="grid gap-3">
          {available.map(({ manifest, sourcePath }) => {
            const current = installedById.get(manifest.id)
            const updateAvailable = current ? compareVersions(manifest.version, current.version) > 0 : false
            const busy = install.isPending || uninstall.isPending
            return <article key={manifest.id} className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <span className="grid size-11 flex-shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300"><Boxes size={20}/></span>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold">{manifest.name}</h3><span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-600 dark:bg-white/10 dark:text-neutral-300">{current ? `Installed ${current.version}` : `Available ${manifest.version}`}</span></div><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{manifest.description}</p></div>
              <div className="flex flex-shrink-0 gap-2">
                {!current && <button type="button" disabled={busy} onClick={() => install.mutate(sourcePath)} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Download size={14}/>Install</button>}
                {current && <button type="button" disabled={busy} title={updateAvailable ? `Update to ${manifest.version}` : 'Reinstall the current version'} onClick={() => install.mutate(sourcePath)} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><RefreshCw size={14}/>Update</button>}
                {current && <button type="button" disabled={busy} onClick={() => { if (confirm(`Uninstall ${manifest.name}? Existing project files and databases will not be removed.`)) uninstall.mutate(manifest.id) }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-400/20 dark:text-red-300 dark:hover:bg-red-400/10"><Trash2 size={14}/>Uninstall</button>}
              </div>
            </article>
          })}
        </div>}
      </div>
      <footer className="flex justify-between border-t border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]"><button type="button" onClick={() => installFromFolder.mutate()} className="text-sm font-medium text-neutral-500 hover:text-cyan-700 dark:hover:text-cyan-300">Install .pac or folder…</button><button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-white/10">Close</button></footer>
    </div>
  </div>
}
