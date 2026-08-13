import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ChevronDown, ChevronUp, Globe2, KeyRound, Mail, Type, UserRound } from 'lucide-react'
import { useDownloadWordpress, useSetupWordpress } from '../../../hooks/useCreateProject'
import { useStartProject } from '../../../hooks/useAurora'
import type { TypeSetupContext, TypeSetupHandle, TypeSetupProps } from './shared'

const LANGUAGES = [
  { value: 'en_US', label: 'English (United States)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'de_DE', label: 'German' },
  { value: 'es_ES', label: 'Spanish (Spain)' },
  { value: 'fr_FR', label: 'French (France)' },
  { value: 'it_IT', label: 'Italian' },
  { value: 'pt_BR', label: 'Portuguese (Brazil)' },
  { value: 'nl_NL', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' }
]

type Multisite = 'none' | 'subdirectory' | 'subdomain'

const MULTISITE_OPTIONS: { value: Multisite; label: string }[] = [
  { value: 'none', label: 'No' },
  { value: 'subdirectory', label: 'Yes – Subdirectory' },
  { value: 'subdomain', label: 'Yes – Subdomain' }
]

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white/80 px-3 py-2 text-sm shadow-sm transition placeholder:text-neutral-400 focus:border-cyan-400 dark:border-white/10 dark:bg-neutral-950/70 dark:placeholder:text-neutral-600'
const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400'

export const WordpressSetup = forwardRef<TypeSetupHandle, TypeSetupProps>(function WordpressSetup(
  { projectName, onValidityChange },
  ref
) {
  const [siteTitle, setSiteTitle] = useState('')
  const [adminUser, setAdminUser] = useState('admin')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [language, setLanguage] = useState('en_US')
  const [multisite, setMultisite] = useState<Multisite>('none')

  const startProject = useStartProject()
  const downloadWordpress = useDownloadWordpress()
  const setupWordpress = useSetupWordpress()

  const isValid =
    adminUser.trim().length > 0 && adminPassword.trim().length > 0 && adminEmail.trim().length > 0

  useEffect(() => {
    onValidityChange(isValid)
  }, [isValid, onValidityChange])

  useImperativeHandle(ref, () => ({
    runPostCreate: async ({ directory, projectName: name }: TypeSetupContext) => {
      // wp-cli needs the containers running, so this ignores any "start
      // after creating" preference — an unstarted WordPress project would
      // just be the same half-built state this whole flow exists to avoid.
      await startProject.mutateAsync(name)
      await downloadWordpress.mutateAsync({ directory, locale: language })
      await setupWordpress.mutateAsync({
        directory,
        siteUrl: `https://${name}.Aurora.site`,
        title: siteTitle.trim() || name,
        adminUser: adminUser.trim(),
        adminPassword: adminPassword.trim(),
        adminEmail: adminEmail.trim(),
        multisite
      })
    }
  }))

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
        <div className="flex items-start gap-3">
          <div className="grid size-10 flex-shrink-0 place-items-center rounded-lg bg-cyan-600 text-white dark:bg-cyan-300 dark:text-neutral-950">
            <Globe2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-cyan-950 dark:text-cyan-100">
              WordPress install
            </p>
            <p className="mt-1 text-xs leading-5 text-cyan-800/80 dark:text-cyan-100/75">
              Core downloads automatically and the project starts for setup.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Site title</label>
          <div className="relative">
            <Type
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder={projectName || 'My WordPress Site'}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Admin username</label>
          <div className="relative">
            <UserRound
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Admin password</label>
          <div className="relative">
            <KeyRound
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Admin email</label>
          <div className="relative">
            <Mail
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@example.com"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 transition hover:border-cyan-200 hover:bg-cyan-50/50 hover:text-cyan-800 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-cyan-400/25 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200"
      >
        <span>Advanced options</span>
        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showAdvanced && (
        <div className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div>
            <label className={labelClass}>Select language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={inputClass}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Is this a WordPress Multisite?</label>
            <select
              value={multisite}
              onChange={(e) => setMultisite(e.target.value as Multisite)}
              className={inputClass}
            >
              {MULTISITE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
})
