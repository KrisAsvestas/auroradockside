import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, Globe2, KeyRound, Mail, RefreshCw, Settings2, Type, UserRound } from 'lucide-react'
import type { AuroraModuleManifest, AuroraModuleSetting } from '@shared/types'
import type { TypeSetupHandle, TypeSetupProps } from './shared'
import { useTerminalStore } from '../../../stores/terminalStore'
import { useStatusStore } from '../../../stores/statusStore'

const inputClass = 'w-full rounded-lg border border-neutral-300 bg-white/80 px-3 py-2 text-sm shadow-sm transition placeholder:text-neutral-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/15 dark:border-white/10 dark:bg-neutral-950/70 dark:placeholder:text-neutral-600'
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400'
const icons = { title: Type, user: UserRound, key: KeyRound, mail: Mail, globe: Globe2, settings: Settings2 }

function password(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export const ExternalModuleSetup = forwardRef<TypeSetupHandle, TypeSetupProps & { module: AuroraModuleManifest }>(
  function ExternalModuleSetup({ module, projectName, onValidityChange }, ref) {
    const fields = module.creation?.setup ?? []
    const [values, setValues] = useState<Record<string, string | number | boolean>>(() => Object.fromEntries(fields.map((field) => [field.id, field.default])))
    const [advanced, setAdvanced] = useState(false)
    const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())
    const valid = fields.every((field) => !field.required || String(values[field.id] ?? '').trim().length > 0)
    useEffect(() => onValidityChange(valid), [valid, onValidityChange])
    useImperativeHandle(ref, () => ({ runPostCreate: async ({ directory }) => {
      const operationId = crypto.randomUUID()
      const label = `Install ${module.name} for ${projectName}`
      useTerminalStore.getState().startOperation(operationId, label)
      useStatusStore.getState().begin(operationId, label)
      await window.api.create.runModuleProjectCreate(operationId, module.id, directory, projectName, values)
    } }), [module.id, module.name, projectName, values])

    function fieldControl(field: AuroraModuleSetting): React.JSX.Element {
      if (field.type === 'boolean') return <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/70 px-3 py-2 text-sm font-medium dark:border-white/10 dark:bg-neutral-950/50"><input type="checkbox" checked={Boolean(values[field.id])} onChange={(event) => setValues({ ...values, [field.id]: event.target.checked })}/>{field.label}</label>
      const Icon = field.icon ? icons[field.icon] : undefined
      if (field.type === 'select') return <select value={String(values[field.id] ?? '')} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} className={inputClass}>{field.options?.map((option) => <option key={option} value={option}>{field.optionLabels?.[option] ?? option}</option>)}</select>
      const visible = visibleSecrets.has(field.id)
      return <div className="relative">
        {Icon && <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/>}
        <input type={field.secret && !visible ? 'password' : field.type === 'number' ? 'number' : field.icon === 'mail' ? 'email' : 'text'} value={String(values[field.id] ?? '')} placeholder={field.placeholder || (field.id === 'title' ? projectName : undefined)} onChange={(event) => setValues({ ...values, [field.id]: field.type === 'number' ? Number(event.target.value) : event.target.value })} className={`${inputClass} ${Icon ? 'pl-9' : ''} ${field.secret ? 'pr-20' : ''}`}/>
        {field.secret && <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1"><button type="button" title="Generate password" onClick={() => setValues({ ...values, [field.id]: password() })} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-cyan-700 dark:hover:bg-white/10"><RefreshCw size={14}/></button><button type="button" title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisibleSecrets((current) => { const next = new Set(current); visible ? next.delete(field.id) : next.add(field.id); return next })} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-cyan-700 dark:hover:bg-white/10">{visible ? <EyeOff size={14}/> : <Eye size={14}/>}</button></div>}
      </div>
    }

    const standardFields = fields.filter((field) => !field.advanced)
    const advancedFields = fields.filter((field) => field.advanced)
    return <div className="grid gap-4">
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10"><div className="flex items-start gap-3"><div className="grid size-10 flex-shrink-0 place-items-center rounded-lg bg-cyan-600 text-white dark:bg-cyan-300 dark:text-neutral-950"><Globe2 size={18}/></div><div><p className="text-sm font-semibold text-cyan-950 dark:text-cyan-100">{module.creation?.intro?.title ?? `${module.name} install`}</p><p className="mt-1 text-xs leading-5 text-cyan-800/80 dark:text-cyan-100/75">{module.creation?.intro?.description ?? `Setup is provided by ${module.name} ${module.version}.`}</p></div></div></div>
      <div className="grid gap-4 sm:grid-cols-2">{standardFields.map((field) => <div key={field.id} className={field.span === 2 ? 'sm:col-span-2' : ''}><label className={labelClass}>{field.label}</label>{fieldControl(field)}</div>)}</div>
      {advancedFields.length > 0 && <><button type="button" onClick={() => setAdvanced((value) => !value)} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 transition hover:border-cyan-200 hover:bg-cyan-50/50 hover:text-cyan-800 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-cyan-400/25 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200"><span>Advanced options</span>{advanced ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}</button>{advanced && <div className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">{advancedFields.map((field) => <div key={field.id}>{field.type !== 'boolean' && <label className={labelClass}>{field.label}</label>}{fieldControl(field)}</div>)}</div>}</>}
    </div>
  }
)
