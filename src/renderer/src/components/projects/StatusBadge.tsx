import { clsx } from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  running:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300',
  stopped:
    'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-white/10 dark:bg-white/[0.08] dark:text-neutral-400',
  paused:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300'
}

const DEFAULT_STYLE =
  'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-white/10 dark:bg-white/[0.08] dark:text-neutral-400'

export function StatusBadge({ status }: { status: string }): React.JSX.Element {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLES[status] ?? DEFAULT_STYLE
      )}
    >
      <span
        className={clsx(
          'size-1.5 rounded-full',
          status === 'running'
            ? 'bg-emerald-500'
            : status === 'paused'
              ? 'bg-amber-500'
              : 'bg-neutral-400'
        )}
      />
      {status}
    </span>
  )
}
