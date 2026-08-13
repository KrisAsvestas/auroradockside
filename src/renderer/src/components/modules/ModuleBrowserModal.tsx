import { useMemo, useState } from 'react'
import { Boxes, ChevronLeft, X } from 'lucide-react'
import type { AuroraModuleManifest } from '@shared/types'
import { useInstalledModules, useInstallModule, useModuleRegistry } from '../../hooks/useModules'

const CATEGORY_LABELS = { application: 'Applications', service: 'Services', tool: 'Developer Tools' } as const

function ModuleSettings({ module, values, onChange }: { module: AuroraModuleManifest; values: Record<string, string | number | boolean>; onChange: (values: Record<string, string | number | boolean>) => void }): React.JSX.Element {
  return <div className="grid gap-4">
    {module.settings.map((setting) => <label key={setting.id} className="grid gap-1.5 text-sm">
      <span className="font-medium">{setting.label}</span>
      {setting.type === 'boolean' ? (
        <input type="checkbox" checked={Boolean(values[setting.id])} onChange={(e) => onChange({ ...values, [setting.id]: e.target.checked })} className="size-4" />
      ) : setting.type === 'select' ? (
        <select value={String(values[setting.id] ?? '')} onChange={(e) => onChange({ ...values, [setting.id]: e.target.value })} className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950">
          {setting.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input value={String(values[setting.id] ?? '')} onChange={(e) => onChange({ ...values, [setting.id]: setting.type === 'number' ? Number(e.target.value) : e.target.value })} className="rounded-md border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950" />
      )}
    </label>)}
  </div>
}

export function ModuleBrowserModal({ name, onClose }: { name: string; onClose: () => void }): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<AuroraModuleManifest | null>(null)
  const [settings, setSettings] = useState<Record<string, string | number | boolean>>({})
  const { data: registry = [], isLoading } = useModuleRegistry()
  const { data: installed = [] } = useInstalledModules(name)
  const install = useInstallModule(name)
  const installedIds = useMemo(() => new Set(installed.map((item) => item.id)), [installed])
  const filtered = useMemo(() => registry.filter((item) => !query.trim() || `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [registry, query])

  function choose(module: AuroraModuleManifest): void {
    setSelected(module)
    setSettings(Object.fromEntries(module.settings.map((setting) => [setting.id, setting.default])))
  }

  async function installSelected(): Promise<void> {
    if (!selected) return
    await install.mutateAsync({ moduleId: selected.id, settings })
    setSelected(null)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8 backdrop-blur-sm">
    <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          {selected && <button onClick={() => setSelected(null)} className="rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"><ChevronLeft size={18}/></button>}
          <div><h2 className="font-semibold">{selected ? selected.name : 'Aurora Module Library'}</h2><p className="text-xs text-neutral-500">{selected ? selected.description : 'Extend this project without rebuilding Dockside.'}</p></div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={18}/></button>
      </header>
      {selected ? <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <div className="mb-5 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300"><Boxes size={20}/></span><div><div className="font-semibold">{selected.name}</div><div className="text-xs uppercase tracking-wide text-neutral-500">{selected.category} · v{selected.version}</div></div></div>
          {selected.settings.length ? <ModuleSettings module={selected} values={settings} onChange={setSettings}/> : <p className="text-sm text-neutral-500">This module has no configuration options.</p>}
          {selected.conflicts.length > 0 && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Application conflict protection: {selected.conflicts.join(', ')}</p>}
          <button disabled={install.isPending || installedIds.has(selected.id)} onClick={() => void installSelected()} className="mt-6 w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{installedIds.has(selected.id) ? 'Already installed' : install.isPending ? 'Installing…' : `Install ${selected.name}`}</button>
        </div>
      </div> : <>
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800"><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search modules…" className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"/></div>
        <div className="flex-1 overflow-y-auto p-5">{isLoading ? <p className="text-sm text-neutral-500">Loading module registry…</p> : (['application','service','tool'] as const).map((category) => {
          const items = filtered.filter((item) => item.category === category); if (!items.length) return null
          return <section key={category} className="mb-6"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{CATEGORY_LABELS[category]}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((module) => <button key={module.id} onClick={() => choose(module)} className="rounded-xl border border-neutral-200 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50/50 dark:border-neutral-800 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-400/5"><div className="flex items-center justify-between"><span className="font-semibold">{module.name}</span><span className="text-[10px] uppercase text-neutral-400">{installedIds.has(module.id) ? 'Installed' : `v${module.version}`}</span></div><p className="mt-2 text-xs leading-relaxed text-neutral-500">{module.description}</p></button>)}</div></section>
        })}</div>
      </>}
    </div>
  </div>
}
