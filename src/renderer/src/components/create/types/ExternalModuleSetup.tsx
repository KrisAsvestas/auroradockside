import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { AuroraModuleManifest } from '@shared/types'
import type { TypeSetupHandle, TypeSetupProps } from './shared'

export const ExternalModuleSetup = forwardRef<TypeSetupHandle, TypeSetupProps & { module: AuroraModuleManifest }>(
  function ExternalModuleSetup({ module, projectName, onValidityChange }, ref) {
    const fields = module.creation?.setup ?? []
    const [values, setValues] = useState<Record<string, string | number | boolean>>(() => Object.fromEntries(fields.map((field) => [field.id, field.default])))
    const valid = fields.every((field) => field.type === 'boolean' || field.type === 'number' || String(values[field.id] ?? '').trim().length > 0)
    useEffect(() => onValidityChange(valid), [valid, onValidityChange])
    useImperativeHandle(ref, () => ({
      runPostCreate: async ({ directory }) => {
        await window.api.create.runModuleProjectCreate(crypto.randomUUID(), module.id, directory, projectName, values)
      }
    }), [module.id, projectName, values])
    return <div className="grid gap-4">
      <div><h3 className="font-semibold">{module.name} setup</h3><p className="text-sm text-neutral-500">Provided by {module.name} {module.version}.</p></div>
      {fields.map((field) => <label key={field.id} className="grid gap-1.5 text-sm"><span className="font-medium">{field.label}</span>
        {field.type === 'boolean' ? <input type="checkbox" checked={Boolean(values[field.id])} onChange={(event) => setValues({ ...values, [field.id]: event.target.checked })}/>
          : field.type === 'select' ? <select value={String(values[field.id] ?? '')} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} className="rounded-lg border p-2 dark:bg-neutral-950">{field.options?.map((option) => <option key={option}>{option}</option>)}</select>
          : <input type={field.id.toLowerCase().includes('password') ? 'password' : field.type === 'number' ? 'number' : 'text'} value={String(values[field.id] ?? '')} onChange={(event) => setValues({ ...values, [field.id]: field.type === 'number' ? Number(event.target.value) : event.target.value })} className="rounded-lg border p-2 dark:bg-neutral-950"/>}
      </label>)}
    </div>
  }
)
