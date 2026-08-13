import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

export function DeleteProjectModal({
  projectName,
  onCancel,
  onConfirm
}: {
  projectName: string
  onCancel: () => void
  onConfirm: (deleteFiles: boolean) => void
}): React.JSX.Element {
  const [deleteFiles, setDeleteFiles] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-8 backdrop-blur-sm">
      <div className="grid w-full max-w-md gap-4 rounded-2xl border border-white/70 bg-white p-5 shadow-[0_30px_100px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-neutral-950">
        <div className="flex items-start gap-3">
          <div className="grid size-10 flex-shrink-0 place-items-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Delete &quot;{projectName}&quot;?
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Aurora will take a database snapshot first, then remove the project&apos;s containers
              and Aurora registration.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
            className="mt-0.5 size-4 accent-red-600"
          />
          <span>
            <span className="block font-semibold text-neutral-900 dark:text-neutral-100">
              Also delete project files from disk
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
              Permanently removes the project folder. This cannot be undone by the database
              snapshot.
            </span>
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(deleteFiles)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-900/20 transition hover:bg-red-500"
          >
            {deleteFiles ? 'Delete project + files' : 'Delete project'}
          </button>
        </div>
      </div>
    </div>
  )
}
