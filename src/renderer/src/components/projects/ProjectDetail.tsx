import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import {
  Boxes,
  Code2,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  Play,
  RotateCw,
  Server,
  Square,
  Trash2,
  Zap,
  Globe2,
  LockKeyhole,
  Radio
} from 'lucide-react'
import type { AuroraSiteCredentials, EnvironmentUpdate } from '@shared/types'
import {
  useDeleteProject,
  useProjectDetail,
  useRestartProject,
  useStartProject,
  useStopProject,
  useUpdateEnvironment
} from '../../hooks/useAurora'
import { StatusBadge } from './StatusBadge'
import { DatabaseSection } from './DatabaseSection'
import { ModulesSection } from './ModulesSection'
import { WordpressTools } from './WordpressTools'
import { DeveloperServices } from './DeveloperServices'
import { DeleteProjectModal } from './DeleteProjectModal'
import { LogViewer } from '../logs/LogViewer'
import { useAppStore } from '../../stores/appStore'

const NODE_VERSIONS = ['20', '22', '24']

const PHP_VERSIONS = [
  '5.6',
  '7.0',
  '7.1',
  '7.2',
  '7.3',
  '7.4',
  '8.0',
  '8.1',
  '8.2',
  '8.3',
  '8.4',
  '8.5'
]

const WEBSERVER_TYPES = [
  { value: 'nginx-fpm', label: 'nginx' },
  { value: 'apache-fpm', label: 'Apache' },
  { value: 'generic', label: 'Generic' }
]

const DATABASE_OPTIONS = [
  { value: 'mariadb:11.8', label: 'MariaDB 11.8' },
  { value: 'mariadb:10.11', label: 'MariaDB 10.11' },
  { value: 'mariadb:10.6', label: 'MariaDB 10.6' },
  { value: 'mysql:8.4', label: 'MySQL 8.4' },
  { value: 'mysql:8.0', label: 'MySQL 8.0' },
  { value: 'mysql:5.7', label: 'MySQL 5.7' },
  { value: 'postgres:17', label: 'PostgreSQL 17' },
  { value: 'postgres:16', label: 'PostgreSQL 16' },
  { value: 'postgres:15', label: 'PostgreSQL 15' }
]

const heroFieldClass =
  'w-full rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/10 focus:border-cyan-300/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'

export function ProjectDetail({ name }: { name: string }): React.JSX.Element {
  const { data: project, isLoading, isError, error } = useProjectDetail(name)
  const startProject = useStartProject()
  const stopProject = useStopProject()
  const restartProject = useRestartProject()
  const deleteProject = useDeleteProject()
  const updateEnvironment = useUpdateEnvironment()
  const selectProject = useAppStore((s) => s.selectProject)
  const [isLogsOpen, setIsLogsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [siteCredentials, setSiteCredentials] = useState<AuroraSiteCredentials | null>(null)
  const [showSitePassword, setShowSitePassword] = useState(false)
  const [isTrustingCA, setIsTrustingCA] = useState(false)

  useEffect(() => {
    let active = true
    if (!project || project.type !== 'wordpress') {
      setSiteCredentials(null)
      return () => { active = false }
    }
    void window.api.secrets.getSiteCredentials(project.approot).then((credentials) => {
      if (active) setSiteCredentials(credentials)
    })
    return () => { active = false }
  }, [project?.approot, project?.type])

  function copyCredential(value: string): void {
    void navigator.clipboard.writeText(value)
  }

  const isBusy =
    startProject.isPending ||
    stopProject.isPending ||
    restartProject.isPending ||
    deleteProject.isPending

  const isEnvUpdating = updateEnvironment.isPending || restartProject.isPending

  function handleDeleteConfirm(deleteFiles: boolean): void {
    if (!project) return
    setIsDeleteOpen(false)
    deleteProject.mutate(
      { name: project.name, approot: project.approot, deleteFiles },
      { onSuccess: () => selectProject(null) }
    )
  }

  async function applyEnvironmentChange(updates: EnvironmentUpdate): Promise<void> {
    if (!project) return
    await updateEnvironment.mutateAsync({ name: project.name, approot: project.approot, updates })
    if (project.status === 'running') {
      await restartProject.mutateAsync(project.name)
    }
  }

  function handleDatabaseChange(value: string): void {
    const confirmed = window.confirm(
      'Changing the database type restarts the project and may require Aurora to migrate or ' +
        'recreate the database. Consider taking a snapshot first if this project has data you ' +
        'want to keep. Continue?'
    )
    if (!confirmed) return
    void applyEnvironmentChange({ database: value })
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-neutral-500 dark:text-neutral-400">Loading {name}…</div>
  }

  if (isError || !project) {
    return (
      <div className="p-6 text-sm text-red-600 dark:text-red-400">
        {error instanceof Error ? error.message : `Failed to load ${name}.`}
      </div>
    )
  }

  const isRunning = project.status === 'running'
  const services = Object.values(project.services)
  const runningServices = services.filter((service) => service.status === 'running').length

  const phpVersions =
    project.php_version && !PHP_VERSIONS.includes(project.php_version)
      ? [project.php_version, ...PHP_VERSIONS]
      : PHP_VERSIONS

  const currentDatabase = `${project.dbinfo.database_type}:${project.dbinfo.database_version}`
  const allowedDatabaseOptions = project.type === 'wordpress' ? DATABASE_OPTIONS.filter((o) => o.value.startsWith('mariadb:')) : DATABASE_OPTIONS
  const databaseOptions = allowedDatabaseOptions.some((o) => o.value === currentDatabase)
    ? DATABASE_OPTIONS
    : [
        {
          value: currentDatabase,
          label: `${project.dbinfo.database_type} ${project.dbinfo.database_version}`
        },
        ...allowedDatabaseOptions
      ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
      <header className="overflow-hidden rounded-2xl border border-white/70 bg-neutral-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:border-white/10">
        <div className="relative p-5">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.09)_1px,transparent_1px)] bg-[size:36px_36px]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cyan-500/10 to-transparent" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-100">
                <Gauge size={13} />
                {runningServices} of {services.length} services running
              </div>
              <div className="flex items-center gap-2">
                <h2 className="truncate text-3xl font-semibold">{project.name}</h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="mt-2 max-w-3xl truncate text-sm text-neutral-300">{project.approot}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isRunning || isBusy}
                onClick={() => startProject.mutate(project.name)}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-emerald-950/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play size={14} /> Start
              </button>
              <button
                type="button"
                disabled={!isRunning || isBusy}
                onClick={() => stopProject.mutate(project.name)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Square size={14} /> Stop
              </button>
              <button
                type="button"
                disabled={!isRunning || isBusy}
                onClick={() => restartProject.mutate(project.name)}
                className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-neutral-950 shadow-sm shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCw size={14} /> Restart
              </button>
              <button
                type="button"
                disabled={!isRunning}
                onClick={() => setIsLogsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileText size={14} /> Logs
              </button>
              {project.type === 'wordpress' && isRunning && (
                <a
                  href={`${project.primary_url}/wp-admin/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/[0.15]"
                >
                  <KeyRound size={14} /> WP Admin
                </a>
              )}
              {project.type === 'wordpress' && isRunning && project.wordpress_network_admin_url && (
                <a href={project.wordpress_network_admin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/[0.15]">
                  <Globe2 size={14} /> Network Admin
                </a>
              )}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-300/20 bg-red-400/10 px-3 py-1.5 text-sm font-medium text-red-100 transition hover:bg-red-400/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
              <Boxes size={17} className="mb-3 text-cyan-200" />
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Project type
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{project.type}</p>{project.type === 'wordpress' && <p className="mt-1 text-[11px] text-neutral-400">{project.wordpress_multisite === 'subdomain' ? 'Multisite · Subdomain' : project.wordpress_multisite === 'subdirectory' ? 'Multisite · Subdirectory' : 'Single site'}</p>}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
              <Code2 size={17} className="mb-3 text-cyan-200" />
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
                PHP
              </p>
              <select
                value={project.php_version ?? ''}
                disabled={isEnvUpdating}
                onChange={(e) => void applyEnvironmentChange({ phpVersion: e.target.value })}
                className={heroFieldClass}
              >
                {phpVersions.map((v) => (
                  <option key={v} value={v} className="text-neutral-900">
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
              <Code2 size={17} className="mb-3 text-cyan-200" />
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Node.js</p>
              <select value={project.nodejs_version ?? '24'} disabled={isEnvUpdating} onChange={(e) => void applyEnvironmentChange({ nodeVersion: e.target.value })} className={heroFieldClass}>
                {NODE_VERSIONS.map((v) => <option key={v} value={v} className="text-neutral-900">{v}</option>)}
              </select>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
              <Server size={17} className="mb-3 text-cyan-200" />
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
                Web server
              </p>
              <select
                value={project.webserver_type ?? 'nginx-fpm'}
                disabled={isEnvUpdating}
                onChange={(e) => void applyEnvironmentChange({ webserverType: e.target.value })}
                className={heroFieldClass}
              >
                {WEBSERVER_TYPES.map((w) => (
                  <option key={w.value} value={w.value} className="text-neutral-900">
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <Zap size={17} className="text-cyan-200" />
                <button
                  type="button"
                  role="switch"
                  aria-checked={project.xdebug_enabled}
                  aria-label="Toggle Xdebug"
                  disabled={isEnvUpdating}
                  onClick={() =>
                    void applyEnvironmentChange({ xdebugEnabled: !project.xdebug_enabled })
                  }
                  className={clsx(
                    'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50',
                    project.xdebug_enabled ? 'bg-cyan-400' : 'bg-white/15'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block size-3.5 transform rounded-full bg-white shadow transition',
                      project.xdebug_enabled ? 'translate-x-4' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Xdebug</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {project.xdebug_enabled ? 'Enabled' : 'Off'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border border-white/70 bg-white/[0.78] p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.55]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"><Globe2 size={14} className="text-cyan-600 dark:text-cyan-300" /> Site URLs</h3>
            <span className={clsx(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold',
              project.router_status === 'running'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : project.router_status === 'provider-error'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'bg-neutral-500/10 text-neutral-500'
            )}>
              <Radio size={11} /> Router {project.router_status === 'running' ? 'online' : project.router_status === 'provider-error' ? 'Docker provider error' : 'offline'}
            </span>
          </div>
          <div className="grid gap-2">
            {[{label:'HTTP',url:project.httpurl,icon:<Globe2 size={14}/>},{label:'HTTPS',url:project.httpsurl,icon:<LockKeyhole size={14}/>}].map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-2 dark:border-white/10 dark:bg-white/[0.04]">
                <span className="flex w-16 items-center gap-1.5 text-xs font-semibold text-neutral-500">{item.icon}{item.label}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{item.url}</span>
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500">Open <ExternalLink size={11}/></a>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/70 pt-3 dark:border-white/10">
            <div>
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Primary protocol</p>
              <p className="text-[11px] text-neutral-500">Both remain available. WordPress canonical URLs follow this setting.</p>
            </div>
            <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-white/10 dark:bg-white/5">
              {(['http','https'] as const).map((protocol) => { const active = project.primary_url.startsWith(`${protocol}:`); return <button key={protocol} type="button" disabled={isEnvUpdating || !isRunning} onClick={() => void applyEnvironmentChange({ primaryProtocol: protocol })} className={clsx('rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition disabled:cursor-not-allowed disabled:opacity-50', active ? 'bg-white text-cyan-700 shadow-sm dark:bg-neutral-800 dark:text-cyan-300' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white')}>{protocol}</button> })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[11px]">
              <p className="font-semibold text-neutral-700 dark:text-neutral-200">Aurora HTTPS certificate</p>
              <p className="mt-0.5 text-neutral-500">Certificate: {project.certificate_status === 'generated' ? 'Generated' : 'Missing'} · System: {project.ca_trust_status === 'trusted' ? 'Trusted' : project.ca_trust_status === 'not-trusted' ? 'Not trusted' : 'Unknown'} · Firefox: {project.firefox_trust_status === 'trusted' ? 'Trusted' : project.firefox_trust_status === 'not-trusted' ? 'Not trusted' : project.firefox_trust_status === 'unavailable' ? 'Needs NSS tools' : 'Unknown'} · Chromium: {project.chromium_trust_status === 'trusted' ? 'Trusted' : project.chromium_trust_status === 'not-trusted' ? 'Not trusted' : project.chromium_trust_status === 'unavailable' ? 'Needs NSS tools' : 'Not detected'}</p>
            </div>
            {(project.ca_trust_status !== 'trusted' || project.firefox_trust_status === 'not-trusted' || project.firefox_trust_status === 'unavailable' || project.chromium_trust_status === 'not-trusted' || project.chromium_trust_status === 'unavailable') && (
              <button type="button" disabled={isTrustingCA} onClick={async () => { try { setIsTrustingCA(true); await window.api.projects.trustCA(); window.location.reload() } finally { setIsTrustingCA(false) } }} className="rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50">
                {isTrustingCA ? 'Installing…' : 'Install / Repair Browser Trust'}
              </button>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-white/70 bg-white/[0.78] p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.55]">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <Database size={14} className="text-cyan-600 dark:text-cyan-300" />
            Database credentials
          </h3>
          <dl className="grid grid-cols-[minmax(110px,0.45fr)_1fr] items-center gap-x-4 gap-y-2 text-sm">
            <dt className="text-neutral-500 dark:text-neutral-400">Type</dt>
            <dd className="font-medium">
              <select
                value={currentDatabase}
                disabled={isEnvUpdating}
                onChange={(e) => handleDatabaseChange(e.target.value)}
                className="w-full max-w-[220px] rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-neutral-950"
              >
                {databaseOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Database</dt>
            <dd className="font-medium">{project.dbinfo.dbname}</dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Username</dt>
            <dd className="font-medium">{project.dbinfo.username}</dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Password</dt>
            <dd className="font-mono text-xs">{project.dbinfo.password}</dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Port</dt>
            <dd className="font-medium">{project.dbinfo.published_port}</dd>
          </dl>
        </section>
      </div>

      {project.type === 'wordpress' && siteCredentials && (
        <section className="rounded-xl border border-white/70 bg-white/[0.78] p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.55]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              <KeyRound size={14} className="text-cyan-600 dark:text-cyan-300" />
              Site credentials
            </h3>
            <a href={siteCredentials.adminUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-500">
              Open WP Admin <ExternalLink size={12} />
            </a>
          </div>
          <dl className="grid grid-cols-[minmax(110px,0.3fr)_1fr] items-center gap-x-4 gap-y-2 text-sm">
            <dt className="text-neutral-500 dark:text-neutral-400">Admin URL</dt>
            <dd className="flex min-w-0 items-center gap-2"><span className="truncate font-mono text-xs">{siteCredentials.adminUrl}</span><button title="Copy admin URL" onClick={() => copyCredential(siteCredentials.adminUrl)} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"><Copy size={13} /></button></dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Username</dt>
            <dd className="flex items-center gap-2"><span className="font-medium">{siteCredentials.username}</span><button title="Copy username" onClick={() => copyCredential(siteCredentials.username)} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"><Copy size={13} /></button></dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Password</dt>
            <dd className="flex items-center gap-2"><span className="min-w-[150px] font-mono text-xs">{showSitePassword ? siteCredentials.password : '••••••••••••'}</span><button title={showSitePassword ? 'Hide password' : 'Show password'} onClick={() => setShowSitePassword((v) => !v)} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">{showSitePassword ? <EyeOff size={14} /> : <Eye size={14} />}</button><button title="Copy password" onClick={() => copyCredential(siteCredentials.password)} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"><Copy size={13} /></button></dd>
            <dt className="text-neutral-500 dark:text-neutral-400">Email</dt>
            <dd className="flex items-center gap-2"><span className="truncate font-medium">{siteCredentials.email}</span><button title="Copy email" onClick={() => copyCredential(siteCredentials.email)} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"><Copy size={13} /></button></dd>
          </dl>
        </section>
      )}

      {project.type === 'wordpress' && isRunning && <WordpressTools project={project} />}
      {isRunning && <DeveloperServices project={project} />}

      <section className="rounded-xl border border-white/70 bg-white/[0.78] p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.55]">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Services
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.short_name}
              className="rounded-xl border border-neutral-200/80 bg-white/80 p-4 transition hover:border-cyan-200 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-cyan-400/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{service.short_name}</p>
                  <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {service.full_name}
                  </p>
                </div>
                <StatusBadge status={service.status} />
              </div>
              <p className="mt-4 truncate rounded-lg bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-600 dark:bg-neutral-950/70 dark:text-neutral-300">
                {service.image}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <DatabaseSection name={project.name} approot={project.approot} />
        <ModulesSection name={project.name} />
      </div>

      {isLogsOpen && (
        <LogViewer
          name={project.name}
          services={Object.keys(project.services)}
          onClose={() => setIsLogsOpen(false)}
        />
      )}

      {isDeleteOpen && (
        <DeleteProjectModal
          projectName={project.name}
          onCancel={() => setIsDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}
