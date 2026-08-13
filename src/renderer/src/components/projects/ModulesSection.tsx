import { useState } from 'react'
import { Boxes, Trash2 } from 'lucide-react'
import { useInstalledModules, useRemoveModule } from '../../hooks/useModules'
import { ModuleBrowserModal } from '../modules/ModuleBrowserModal'

export function ModulesSection({ name }: { name: string }): React.JSX.Element {
  const { data: installed = [], isLoading } = useInstalledModules(name)
  const remove = useRemoveModule(name)
  const [open, setOpen] = useState(false)
  return <section className="rounded-xl border border-white/70 bg-white/[0.78] p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.55]">
    <div className="mb-3 flex items-center justify-between"><div><h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Modules</h3><p className="mt-1 text-xs text-neutral-400">Applications, services and developer tools.</p></div><button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white/70 px-2.5 py-1 text-xs font-medium dark:border-white/10 dark:bg-white/[0.05]"><Boxes size={12}/> Module Library</button></div>
    {isLoading ? <p className="text-sm text-neutral-500">Loading modules…</p> : installed.length === 0 ? <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-white/10">No modules installed. The base PHP + Node environment is ready.</p> : <div className="grid gap-2 sm:grid-cols-2">{installed.map((module) => <div key={module.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-white/10"><div><div className="text-sm font-semibold">{module.name}</div><div className="text-xs capitalize text-neutral-500">{module.category} · v{module.version}</div></div><button disabled={remove.isPending} onClick={() => { if (window.confirm(`Remove module "${module.name}"?`)) remove.mutate(module.id) }} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10"><Trash2 size={14}/></button></div>)}</div>}
    {open && <ModuleBrowserModal name={name} onClose={() => setOpen(false)}/>} 
  </section>
}
