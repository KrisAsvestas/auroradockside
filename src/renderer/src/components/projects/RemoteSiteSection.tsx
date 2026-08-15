import { useEffect, useState } from 'react'
import { ArrowDownToLine, CheckCircle2, FolderKey, KeyRound, Link2, Server, ShieldCheck } from 'lucide-react'
import type { AuroraRemoteSiteProfile, AuroraRemoteSiteStatus } from '@shared/types'
import { usePullRemoteSite, useRemoteSiteProfile, useSaveRemoteSite, useTestRemoteSite } from '../../hooks/useRemoteSite'

const blank: AuroraRemoteSiteProfile = { siteUrl: '', wordpressUsername: '', applicationPassword: '', sshHost: '', sshPort: 22, sshUsername: '', privateKeyPath: '', remotePath: '' }
const input = 'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-neutral-950 dark:text-white'

export function RemoteSiteSection({ name, approot, projectType }: { name: string; approot: string; projectType: string }): React.JSX.Element | null {
  const { data } = useRemoteSiteProfile(name, approot)
  const save = useSaveRemoteSite(name, approot)
  const test = useTestRemoteSite(name, approot)
  const pull = usePullRemoteSite(name)
  const [profile, setProfile] = useState<AuroraRemoteSiteProfile>(blank)
  const [status, setStatus] = useState<AuroraRemoteSiteStatus | null>(null)

  useEffect(() => { if (data) setProfile({ ...data, applicationPassword: '' }) }, [data])
  if (projectType !== 'wordpress') return null
  const set = <K extends keyof AuroraRemoteSiteProfile>(key: K, value: AuroraRemoteSiteProfile[K]): void => setProfile((current) => ({ ...current, [key]: value }))
  const busy = save.isPending || test.isPending || pull.isPending
  const error = save.error ?? test.error ?? pull.error

  async function selectKey(): Promise<void> {
    const path = await window.api.remote.pickPrivateKey()
    if (path) set('privateKeyPath', path)
  }

  async function testConnection(): Promise<void> {
    const result = await test.mutateAsync(profile)
    setStatus(result)
  }

  function pullRemote(): void {
    const confirmed = window.confirm(`Pull ${profile.siteUrl || 'the remote site'} into ${name}?\n\nAurora will preserve its local configuration, copy remote WordPress files, replace the local database, and rewrite production URLs for local use. A pre-pull recovery folder will be created.`)
    if (confirmed) pull.mutate()
  }

  return <section className="rounded-xl border border-cyan-200/80 bg-gradient-to-br from-white to-cyan-50/60 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:border-cyan-300/15 dark:from-neutral-950 dark:to-cyan-950/20">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-300"><Link2 size={14} className="text-cyan-600 dark:text-cyan-300"/> Remote Site</h3><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Connect this local project to its production WordPress site.</p></div>
      {status && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={13}/> Connected · WordPress {status.wordpressVersion}</span>}
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Production site URL<input className={`${input} mt-1.5`} type="url" placeholder="https://example.com" value={profile.siteUrl} onChange={(e) => set('siteUrl', e.target.value)}/></label>
      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">WordPress username<input className={`${input} mt-1.5`} autoComplete="username" value={profile.wordpressUsername} onChange={(e) => set('wordpressUsername', e.target.value)}/></label>
      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Application Password<input className={`${input} mt-1.5`} type="password" autoComplete="new-password" placeholder={profile.configured ? 'Saved securely — leave blank to keep' : 'xxxx xxxx xxxx xxxx'} value={profile.applicationPassword ?? ''} onChange={(e) => set('applicationPassword', e.target.value)}/></label>
      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">SSH host<input className={`${input} mt-1.5`} placeholder="server.example.com" value={profile.sshHost} onChange={(e) => set('sshHost', e.target.value)}/></label>
      <div className="grid grid-cols-[1fr_90px] gap-2"><label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">SSH username<input className={`${input} mt-1.5`} value={profile.sshUsername} onChange={(e) => set('sshUsername', e.target.value)}/></label><label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Port<input className={`${input} mt-1.5`} type="number" min={1} max={65535} value={profile.sshPort} onChange={(e) => set('sshPort', Number(e.target.value))}/></label></div>
      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">WordPress path on server<input className={`${input} mt-1.5 font-mono`} placeholder="/home/user/public_html" value={profile.remotePath} onChange={(e) => set('remotePath', e.target.value)}/></label>
      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 md:col-span-2 xl:col-span-3">SSH private key<div className="mt-1.5 flex gap-2"><input className={`${input} font-mono`} readOnly placeholder="Use SSH agent, or select a private key" value={profile.privateKeyPath}/><button type="button" onClick={() => void selectKey()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold hover:border-cyan-300 dark:border-white/10 dark:bg-white/5"><FolderKey size={14}/> Choose key</button></div></label>
    </div>
    {status && <div className="mt-4 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 sm:grid-cols-3 dark:border-emerald-300/15 dark:bg-emerald-400/5 dark:text-emerald-200"><span><b>{status.siteName}</b><br/>{status.siteUrl}</span><span>PHP {status.phpVersion}<br/>Database {status.databaseVersion}</span><span>Connector {status.connectorVersion}<br/>SSH verified</span></div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-400/10 dark:text-red-200">{error.message}</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/70 pt-4 dark:border-white/10">
      <p className="flex items-center gap-1.5 text-[11px] text-neutral-500"><ShieldCheck size={13}/> Credentials are encrypted on this computer. Pull never uploads changes.</p>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => save.mutate(profile)} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:border-cyan-300 disabled:opacity-50 dark:border-white/10 dark:bg-white/5"><KeyRound size={13}/> Save</button><button type="button" disabled={busy} onClick={() => void testConnection()} className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300/50 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-50 dark:bg-cyan-400/10 dark:text-cyan-200"><Server size={13}/> {test.isPending ? 'Testing…' : 'Test connection'}</button><button type="button" disabled={busy || !profile.configured} onClick={pullRemote} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 disabled:opacity-40"><ArrowDownToLine size={13}/> {pull.isPending ? 'Pulling…' : 'Pull to Local'}</button></div>
    </div>
  </section>
}
