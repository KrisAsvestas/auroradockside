import { useEffect } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useToastStore, type Toast } from '../../stores/toastStore'

const AUTO_DISMISS_MS = 4000

function ToastItem({ toast }: { toast: Toast }): React.JSX.Element {
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  const isSuccess = toast.variant === 'success'

  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur',
        isSuccess
          ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/95 dark:text-emerald-300'
          : 'border-red-200 bg-red-50/95 text-red-800 dark:border-red-900 dark:bg-red-950/95 dark:text-red-300'
      )}
    >
      {isSuccess ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {toast.message}
    </div>
  )
}

export function Toaster(): React.JSX.Element {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
