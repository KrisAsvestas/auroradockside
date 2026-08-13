import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { PlayCircle } from 'lucide-react'
import { useStartProject } from '../../../hooks/useAurora'
import type { TypeSetupContext, TypeSetupHandle, TypeSetupProps } from './shared'

// Fallback setup panel for any project type without a dedicated one yet
// (see registry.ts). Just scaffolds via `Aurora config` and optionally starts
// the project — no type-specific installer.
export const GenericSetup = forwardRef<TypeSetupHandle, TypeSetupProps>(function GenericSetup(
  { onValidityChange },
  ref
) {
  const [startAfterCreate, setStartAfterCreate] = useState(true)
  const startProject = useStartProject()

  useEffect(() => {
    onValidityChange(true)
  }, [onValidityChange])

  useImperativeHandle(ref, () => ({
    runPostCreate: async ({ projectName }: TypeSetupContext) => {
      if (startAfterCreate) {
        await startProject.mutateAsync(projectName)
      }
    }
  }))

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
        <div className="flex items-start gap-3">
          <div className="grid size-10 flex-shrink-0 place-items-center rounded-lg bg-cyan-600 text-white dark:bg-cyan-300 dark:text-neutral-950">
            <PlayCircle size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-cyan-950 dark:text-cyan-100">
              Ready after Aurora config
            </p>
            <p className="mt-1 text-xs leading-5 text-cyan-800/80 dark:text-cyan-100/75">
              This type uses Aurora defaults, then you can finish the app-specific install in the
              project.
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span>
          <span className="block font-semibold">Start after creating</span>
          <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
            Launch the environment as soon as config is written.
          </span>
        </span>
        <input
          type="checkbox"
          checked={startAfterCreate}
          onChange={(e) => setStartAfterCreate(e.target.checked)}
          className="size-4 accent-cyan-600"
        />
      </label>
    </div>
  )
})
