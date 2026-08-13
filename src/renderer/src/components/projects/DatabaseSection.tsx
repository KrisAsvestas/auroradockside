import { useState } from 'react'
import { Camera, Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import {
  useCreateSnapshot,
  useDeleteSnapshot,
  useExportDatabase,
  useImportDatabase,
  useRestoreSnapshot,
  useSnapshots
} from '../../hooks/useDatabase'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function DatabaseSection({
  name,
  approot
}: {
  name: string
  approot: string
}): React.JSX.Element {
  const { data: snapshots, isLoading } = useSnapshots(name, approot)
  const createSnapshot = useCreateSnapshot(name, approot)
  const restoreSnapshot = useRestoreSnapshot(name, approot)
  const deleteSnapshot = useDeleteSnapshot(name, approot)
  const importDatabase = useImportDatabase(name, approot)
  const exportDatabase = useExportDatabase(name, approot)

  // Electron doesn't support window.prompt() (it silently returns null with
  // no dialog), so snapshot naming needs an inline input instead.
  const [isNaming, setIsNaming] = useState(false)
  const [snapshotNameDraft, setSnapshotNameDraft] = useState('')

  const isBusy =
    createSnapshot.isPending ||
    restoreSnapshot.isPending ||
    deleteSnapshot.isPending ||
    importDatabase.isPending ||
    exportDatabase.isPending

  function submitSnapshotName(): void {
    const trimmed = snapshotNameDraft.trim()
    createSnapshot.mutate(trimmed || undefined)
    setIsNaming(false)
    setSnapshotNameDraft('')
  }

  return (
    <section className="rounded-xl border border-white/70 bg-white/[0.78] p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/[0.55]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Database
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {isNaming ? (
            <>
              <input
                autoFocus
                type="text"
                placeholder="Snapshot name (optional)"
                value={snapshotNameDraft}
                onChange={(e) => setSnapshotNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSnapshotName()
                  if (e.key === 'Escape') setIsNaming(false)
                }}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-neutral-950"
              />
              <button
                type="button"
                onClick={submitSnapshotName}
                className="rounded-md bg-cyan-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-cyan-500"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsNaming(false)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-white/10"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => importDatabase.mutate()}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white/70 px-2.5 py-1 text-xs font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/10"
              >
                <Upload size={12} /> Import
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => exportDatabase.mutate()}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white/70 px-2.5 py-1 text-xs font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/10"
              >
                <Download size={12} /> Export
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsNaming(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm shadow-cyan-900/[0.15] transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Camera size={12} /> Snapshot
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/70 px-3 py-4 text-sm text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
          Loading snapshots…
        </p>
      ) : !snapshots || snapshots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/70 px-3 py-4 text-sm text-neutral-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400">
          No snapshots yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200/80 bg-white dark:border-white/10 dark:bg-neutral-950/70">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500 dark:bg-white/[0.04] dark:text-neutral-400">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr
                  key={snapshot.Name}
                  className="border-t border-neutral-200/80 transition hover:bg-cyan-50/40 dark:border-white/10 dark:hover:bg-cyan-400/5"
                >
                  <td className="px-3 py-2 font-medium">{snapshot.Name}</td>
                  <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">
                    {formatDate(snapshot.Created)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => restoreSnapshot.mutate(snapshot.Name)}
                        title="Restore"
                        className="rounded p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-neutral-100"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (window.confirm(`Delete snapshot "${snapshot.Name}"?`)) {
                            deleteSnapshot.mutate(snapshot.Name)
                          }
                        }}
                        title="Delete"
                        className="rounded p-1 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-400/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
