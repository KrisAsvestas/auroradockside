import { Database, ExternalLink, Info, RotateCw, TerminalSquare, Wrench } from 'lucide-react'
import type { AuroraProjectDetail } from '@shared/types'
import { useTerminalStore } from '../../stores/terminalStore'
import { useStatusStore } from '../../stores/statusStore'

export function DeveloperServices({ project }: { project: AuroraProjectDetail }): React.JSX.Element {
  const button = 'inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300'
  async function streamed(label: string, fn: (id: string) => Promise<void>): Promise<void> {
    const id=crypto.randomUUID(); useTerminalStore.getState().startOperation(id,label); useStatusStore.getState().begin(id,label); await fn(id)
  }
  return <section className="rounded-xl border border-neutral-200/90 bg-white/90 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.55]">
    <div className="mb-4"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"><Wrench size={14} className="text-cyan-600 dark:text-cyan-300"/> Project developer services</h3><p className="mt-1 text-xs text-neutral-500">Database administration, PHP diagnostics, terminal access and service controls.</p></div>
    <div className="flex flex-wrap gap-2">
      {project.adminer_url && <a className={button} href={project.adminer_url} target="_blank" rel="noreferrer"><Database size={13}/> Adminer <ExternalLink size={11}/></a>}
      <button className={button} onClick={() => void streamed(`PHP info · ${project.name}`,(id)=>window.api.projects.phpInfo(id,project.name))}><Info size={13}/> PHP info</button>
      <button className={button} onClick={() => void window.api.projects.openTerminal(project.name)}><TerminalSquare size={13}/> Project terminal</button>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {Object.values(project.services).map(service => <div key={service.short_name} className="flex items-center justify-between rounded-lg border border-neutral-200/80 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"><div className="min-w-0"><div className="truncate text-xs font-semibold">{service.short_name}</div><div className="truncate text-[10px] text-neutral-500">{service.status}</div></div><button title={`Restart ${service.short_name}`} className="rounded p-1.5 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => void streamed(`Restart ${service.short_name} · ${project.name}`,(id)=>window.api.projects.restartService(id,project.name,service.short_name))}><RotateCw size={13}/></button></div>)}
    </div>
  </section>
}
