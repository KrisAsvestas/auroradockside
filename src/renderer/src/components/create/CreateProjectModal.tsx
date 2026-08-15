import { useRef, useState } from 'react'
import { clsx } from 'clsx'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  FolderOpen,
  Globe2,
  Sparkles,
  X
} from 'lucide-react'
import { useCreateProject } from '../../hooks/useCreateProject'
import { useAppStore } from '../../stores/appStore'
import { useModuleRegistry } from '../../hooks/useModules'
import { GenericSetup } from './types/GenericSetup'
import { ExternalModuleSetup } from './types/ExternalModuleSetup'
import type { TypeSetupHandle } from './types/shared'
import { isValidProjectName, slugifyProjectName } from './projectName'
import docksideIcon from '../../assets/dockside-icon.png'

type Step = 'site' | 'setup'

const fieldClass =
  'w-full rounded-lg border border-neutral-300 bg-white/80 px-3 py-2 text-sm shadow-sm transition placeholder:text-neutral-400 focus:border-cyan-400 dark:border-white/10 dark:bg-neutral-950/70 dark:placeholder:text-neutral-600'

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400'

const TYPE_ICONS: Record<string, typeof Globe2> = {
  '': Sparkles
}

export function CreateProjectModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [step, setStep] = useState<Step>('site')
  const [directory, setDirectory] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectType, setProjectType] = useState('')
  const [docroot, setDocroot] = useState('')
  const [setupValid, setSetupValid] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phpVersion, setPhpVersion] = useState('8.4')
  const [nodeVersion, setNodeVersion] = useState('24')
  const [webServer, setWebServer] = useState<'nginx' | 'apache'>('nginx')
  const [database, setDatabase] = useState<'mariadb' | 'mysql' | 'postgres'>('mariadb')
  const [databaseVersion, setDatabaseVersion] = useState('11.8')
  const [adminer, setAdminer] = useState(true)
  const [redis, setRedis] = useState(false)
  const [mailpit, setMailpit] = useState(false)
  const [xdebug, setXdebug] = useState(false)

  const createProject = useCreateProject()
  const selectProject = useAppStore((s) => s.selectProject)
  const setupRef = useRef<TypeSetupHandle>(null)
  const { data: moduleRegistry = [] } = useModuleRegistry()
  const applicationModules = moduleRegistry.filter((module) => module.category === 'application')
  const selectedModule = applicationModules.find((module) => module.id === projectType)
  const getTypeLabel = (type: string): string => applicationModules.find((module) => module.id === type)?.name ?? 'project'

  const trimmedName = projectName.trim()
  const nameValid = trimmedName.length > 0 && isValidProjectName(trimmedName)
  const canContinue = directory !== null && nameValid && selectedModule !== undefined
  const canSubmit = canContinue && setupValid && !isSubmitting

  async function handlePickDirectory(): Promise<void> {
    const picked = await window.api.create.pickDirectory()
    if (!picked) return
    setDirectory(picked)
    if (!projectName) {
      const name = picked.split('/').filter(Boolean).pop() ?? ''
      setProjectName(slugifyProjectName(name))
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!directory || !canSubmit) return
    const name = projectName.trim()
    setIsSubmitting(true)
    try {
      await createProject.mutateAsync({ directory, projectName: name, projectType, docroot, stack: { phpVersion, nodeVersion, webServer, database, databaseVersion, adminer, redis, mailpit, xdebug } })
    } catch {
      setIsSubmitting(false)
      return
    }

    // Module post-create hooks (starting services, provisioning an application,
    // etc.) can run long. Close the modal as soon as the quick `Aurora
    // config` step succeeds instead of blocking the whole wizard on it —
    // the terminal panel already tracks and surfaces this operation's
    // progress and any failure independently of the modal.
    const runPostCreate = setupRef.current?.runPostCreate
    selectProject(name)
    onClose()
    runPostCreate?.({ directory, projectName: name }).catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-3 backdrop-blur-sm sm:p-4">
      <div
        className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/70 bg-white text-neutral-900 shadow-[0_30px_100px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100 dark:shadow-[0_30px_100px_rgba(0,0,0,0.48)] md:grid-cols-[0.82fr_1.18fr]"
        style={{ height: 'min(760px, calc(100vh - 24px))', maxHeight: 'calc(100vh - 24px)' }}
      >
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6 text-neutral-950 dark:bg-none dark:bg-neutral-950 dark:text-white md:block">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(8,145,178,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(8,145,178,0.09)_1px,transparent_1px)] bg-[size:34px_34px] dark:bg-[linear-gradient(rgba(45,212,191,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.11)_1px,transparent_1px)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cyan-200/55 to-transparent dark:from-cyan-500/20" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <img
                src={docksideIcon}
                alt=""
                className="mb-5 size-16 rounded-2xl shadow-lg shadow-cyan-950/30"
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-200">
                Project launch
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight">
                Create a local site that feels ready to work.
              </h2>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-cyan-200/80 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.08]">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Destination
                </p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {directory ? directory.split('/').filter(Boolean).pop() : 'Choose a folder'}
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200/80 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.08]">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Project
                </p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {projectName.trim() || 'Name pending'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_100%_0%,rgba(6,182,212,0.08),transparent_36%),linear-gradient(180deg,#f8fafc_0%,#ffffff_58%,#f0f9fa_100%)] [scrollbar-gutter:stable] dark:bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,0.10),transparent_36%),linear-gradient(180deg,#0a0f16_0%,#090c12_58%,#071417_100%)]">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/90">
            <div>
              <h2 className="text-base font-semibold">
                {step === 'site' ? 'New Project' : `Set up ${getTypeLabel(projectType)}`}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                {(['site', 'setup'] as const).map((item, index) => (
                  <div
                    key={item}
                    className={clsx(
                      'flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium',
                      step === item
                        ? 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-400'
                    )}
                  >
                    <span className="grid size-4 place-items-center rounded-full bg-current text-[10px]">
                      <span className="text-white dark:text-neutral-950">{index + 1}</span>
                    </span>
                    {item === 'site' ? 'Project' : 'Setup'}
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-neutral-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5">
            <div className="flex flex-col gap-5">
            {step === 'site' ? (
              <>
                <div>
                  <label className={labelClass}>Project folder</label>
                  <button
                    type="button"
                    onClick={handlePickDirectory}
                    className={clsx(
                      'group flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-3 text-left text-sm transition',
                      directory
                        ? 'border-cyan-200 bg-cyan-50/60 text-neutral-900 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-neutral-100'
                        : 'border-neutral-300 bg-neutral-50/70 text-neutral-500 hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-cyan-400/25 dark:hover:bg-cyan-400/10'
                    )}
                  >
                    <span className="grid size-9 flex-shrink-0 place-items-center rounded-lg bg-white text-cyan-700 shadow-sm dark:bg-neutral-950/70 dark:text-cyan-300">
                      <FolderOpen size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {directory ?? 'Choose a folder…'}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                        This becomes the project root.
                      </span>
                    </span>
                    {directory && <Check size={16} className="text-cyan-700 dark:text-cyan-300" />}
                  </button>
                </div>

                <div>
                  <label className={labelClass}>Project name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-project"
                    className={fieldClass}
                  />
                  {trimmedName.length > 0 && !nameValid && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      Use only letters, numbers, and hyphens — no spaces (e.g. &quot;
                      {slugifyProjectName(trimmedName) || 'my-project'}&quot;).
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Project type</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {applicationModules.map((module) => ({ value: module.id, label: module.name, defaults: module.defaults, creation: module.creation })).map((t) => {
                      const Icon = TYPE_ICONS[t.value] ?? Boxes
                      const isSelected = projectType === t.value

                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => {
                            setProjectType(t.value)
                            setPhpVersion(t.creation?.phpVersions?.[0] ?? '8.4')
                            if (!docroot.trim() && t.defaults?.docroot) setDocroot(t.defaults.docroot)
                          }}
                          className={clsx(
                            'flex min-h-16 items-center gap-3 rounded-xl border px-3 py-3 text-left transition',
                            isSelected
                              ? 'border-cyan-300 bg-cyan-50 text-cyan-950 shadow-sm shadow-cyan-900/5 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100'
                              : 'border-neutral-200 bg-white/70 hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-cyan-400/25 dark:hover:bg-cyan-400/10'
                          )}
                        >
                          <span
                            className={clsx(
                              'grid size-9 flex-shrink-0 place-items-center rounded-lg',
                              isSelected
                                ? 'bg-cyan-600 text-white dark:bg-cyan-300 dark:text-neutral-950'
                                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-950/70 dark:text-neutral-400'
                            )}
                          >
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{t.label}</span>
                            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                              {t.value ? 'Use Aurora type preset' : 'Let Aurora inspect it'}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                    {applicationModules.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"><p className="font-semibold">No application modules installed</p><p className="mt-1">Close this window and use <strong>Modules</strong> at the bottom of the sidebar to install one.</p></div>}
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="mb-3">
                    <p className="text-sm font-semibold">Development stack</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Aurora core owns the runtime; the application is a module layered on top.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className={labelClass}>PHP</label><select className={fieldClass} value={phpVersion} onChange={(e)=>setPhpVersion(e.target.value)}>{(selectedModule?.creation?.phpVersions ?? ['8.2','8.3','8.4','8.5']).map(v=><option key={v}>{v}</option>)}</select></div>
                    <div><label className={labelClass}>Node.js</label><select className={fieldClass} value={nodeVersion} onChange={(e)=>setNodeVersion(e.target.value)}>{['20','22','24'].map(v=><option key={v}>{v}</option>)}</select></div>
                    <div><label className={labelClass}>Web server</label><select className={fieldClass} value={webServer} onChange={(e)=>setWebServer(e.target.value as 'nginx'|'apache')}><option value="nginx">nginx</option><option value="apache">Apache</option></select></div>
                    <div><label className={labelClass}>Database</label><select className={fieldClass} value={`${database}:${databaseVersion}`} onChange={(e)=>{const [kind,version]=e.target.value.split(':');setDatabase(kind as 'mariadb'|'mysql'|'postgres');setDatabaseVersion(version)}}>{selectedModule?.creation?.databases?.includes('mariadb') !== false && <><option value="mariadb:11.8">MariaDB 11.8</option><option value="mariadb:10.11">MariaDB 10.11</option></>}{selectedModule?.creation?.databases?.includes('mysql') !== false && <><option value="mysql:8.4">MySQL 8.4</option><option value="mysql:8.0">MySQL 8.0</option></>}{selectedModule?.creation?.databases?.includes('postgres') !== false && <><option value="postgres:17">PostgreSQL 17</option><option value="postgres:16">PostgreSQL 16</option></>}</select></div>
                    <div className="grid grid-cols-2 gap-2 pt-5">
                      {[['Adminer',adminer,setAdminer],['Redis',redis,setRedis],['Mailpit',mailpit,setMailpit],['Xdebug',xdebug,setXdebug]].map(([label,value,setter])=><label key={label as string} className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={value as boolean} onChange={(e)=>(setter as (v:boolean)=>void)(e.target.checked)} />{label as string}</label>)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Docroot (optional)</label>
                  <input
                    type="text"
                    value={docroot}
                    onChange={(e) => setDocroot(e.target.value)}
                    placeholder="e.g. web, public — leave blank for project root"
                    className={fieldClass}
                  />
                </div>
              </>
            ) : selectedModule ? (
              <ExternalModuleSetup ref={setupRef} module={selectedModule} projectName={projectName.trim()} onValidityChange={setSetupValid} />
            ) : (
              <GenericSetup
                ref={setupRef}
                projectName={projectName.trim()}
                onValidityChange={setSetupValid}
              />
            )}
            </div>
          </div>

          <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/90 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/90">
            <button
              type="button"
              onClick={step === 'site' ? onClose : () => setStep('site')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition hover:bg-white hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-neutral-100"
            >
              {step === 'site' ? null : <ArrowLeft size={14} />}
              {step === 'site' ? 'Cancel' : 'Go back'}
            </button>

            {step === 'site' ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep('setup')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-cyan-900/20 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-cyan-900/20 transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? 'Creating…' : 'Add Site'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
