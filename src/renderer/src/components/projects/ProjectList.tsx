import { clsx } from 'clsx'
import { FolderKanban, Loader2 } from 'lucide-react'
import { useProjects } from '../../hooks/useAurora'
import { useAppStore } from '../../stores/appStore'
import { StatusBadge } from './StatusBadge'

export function ProjectList(): React.JSX.Element {
  const { data: projects, isLoading, isError, error } = useProjects()
  const selectedProjectName = useAppStore((s) => s.selectedProjectName)
  const selectProject = useAppStore((s) => s.selectProject)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-neutral-500 dark:text-neutral-400">
        <Loader2 size={15} className="animate-spin text-cyan-600 dark:text-cyan-300" />
        Loading projects…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-red-600 dark:text-red-400">
        {error instanceof Error ? error.message : 'Failed to load Aurora projects.'}
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="m-3 rounded-lg border border-dashed border-neutral-300 bg-white/60 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-white/[0.03] dark:text-neutral-400">
        <div className="mb-3 grid size-10 place-items-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
          <FolderKanban size={18} />
        </div>
        <p className="font-medium text-neutral-800 dark:text-neutral-200">No Aurora projects yet</p>
        <p className="mt-1 leading-5">
          Create a project with the + button.{' '}
          
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5 p-2.5">
      {projects.map((project) => (
        <li key={project.name}>
          <button
            type="button"
            onClick={() => selectProject(project.name)}
            className={clsx(
              'group relative flex w-full flex-col gap-1 overflow-hidden rounded-lg border px-3 py-2.5 text-left transition',
              selectedProjectName === project.name
                ? 'border-cyan-200 bg-cyan-50/90 shadow-sm shadow-cyan-900/5 dark:border-cyan-400/25 dark:bg-cyan-400/10'
                : 'border-transparent hover:border-neutral-200 hover:bg-white/70 hover:shadow-sm dark:hover:border-white/10 dark:hover:bg-white/[0.04]'
            )}
          >
            <span
              className={clsx(
                'absolute inset-y-2 left-0 w-1 rounded-r-full transition-opacity',
                selectedProjectName === project.name
                  ? 'bg-cyan-500 opacity-100'
                  : 'bg-neutral-300 opacity-0 group-hover:opacity-100 dark:bg-neutral-600'
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold">{project.name}</span>
              <StatusBadge status={project.status} />
            </div>
            <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {project.module_available === false ? project.status_desc : `${project.type} · ${project.shortroot}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
