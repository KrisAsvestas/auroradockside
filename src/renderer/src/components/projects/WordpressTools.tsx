import { useState } from 'react'
import { Bug, Hammer, List, RefreshCw, Search, ShieldAlert, TerminalSquare, Wrench } from 'lucide-react'
import type { AuroraProjectDetail } from '@shared/types'
import { useTerminalStore } from '../../stores/terminalStore'
import { useStatusStore } from '../../stores/statusStore'

export function WordpressTools({ project }: { project: AuroraProjectDetail }): React.JSX.Element {
  const [busy, setBusy] = useState<string | null>(null)
  const [debug, setDebug] = useState<boolean | null>(null)
  const [maintenance, setMaintenance] = useState(false)

  async function run(action: string, label: string, payload?: string): Promise<void> {
    const id = crypto.randomUUID()
    useTerminalStore.getState().startOperation(id, label)
    useStatusStore.getState().begin(id, label)
    setBusy(action)
    try { await window.api.wordpress.run(id, project.name, action, payload) }
    finally { setBusy(null) }
  }

  function searchReplace(): void {
    const from = window.prompt('Search for (old URL or text):')
    if (!from) return
    const to = window.prompt('Replace with:')
    if (!to || from === to) return
    if (!window.confirm(`Replace all occurrences of:\n\n${from}\n\nwith:\n\n${to}\n\nA database snapshot is recommended first. Continue?`)) return
    void run('search-replace', `WP search-replace · ${project.name}`, `${from}\n${to}`)
  }

  const button = 'inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:text-neutral-200 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300'

  return (
    <section className="rounded-xl border border-white/70 bg-white/[0.78] p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.55]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"><Wrench size={14} className="text-cyan-600 dark:text-cyan-300" /> WordPress developer tools</h3>
          <p className="mt-1 text-xs text-neutral-500">WP-CLI commands run inside the project network and stream output to Dockside's terminal.</p>
        </div>
        <div className="text-right text-[11px] text-neutral-500">
          <div>PHP {project.php_version ?? '—'} · Node {project.nodejs_version ?? '—'}</div>
          <div>{project.wordpress_multisite === 'subdomain' ? 'Multisite · Subdomain' : project.wordpress_multisite === 'subdirectory' ? 'Multisite · Subdirectory' : 'Single site'}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={!!busy} onClick={() => void run('cache-flush', `WP cache flush · ${project.name}`)}><RefreshCw size={13}/> Flush cache</button>
        <button className={button} disabled={!!busy} onClick={() => void run('rewrite-flush', `WP rewrite flush · ${project.name}`)}><Hammer size={13}/> Flush rewrites</button>
        <button className={button} disabled={!!busy} onClick={() => { const next=!maintenance; setMaintenance(next); void run(next?'maintenance-on':'maintenance-off', `${next?'Enable':'Disable'} maintenance · ${project.name}`) }}><ShieldAlert size={13}/> {maintenance ? 'Disable' : 'Enable'} maintenance</button>
        <button className={button} disabled={!!busy} onClick={() => { const next=debug === null ? true : !debug; setDebug(next); void run(next?'debug-on':'debug-off', `${next?'Enable':'Disable'} WP_DEBUG · ${project.name}`) }}><Bug size={13}/> {debug ? 'Disable' : 'Enable'} WP_DEBUG</button>
        <button className={button} disabled={!!busy} onClick={searchReplace}><Search size={13}/> Search & replace</button>
        <button className={button} disabled={!!busy} onClick={() => void run('plugin-list', `WP plugins · ${project.name}`)}><List size={13}/> Plugins</button>
        <button className={button} disabled={!!busy} onClick={() => void run('theme-list', `WP themes · ${project.name}`)}><List size={13}/> Themes</button>
        <button className={button} disabled={!!busy} onClick={() => void run('core-version', `WP-CLI · ${project.name}`)}><TerminalSquare size={13}/> WP version</button>
      </div>
    </section>
  )
}
