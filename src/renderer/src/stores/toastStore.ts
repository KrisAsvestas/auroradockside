import { create } from 'zustand'

export type ToastVariant = 'success' | 'error'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
}

interface ToastState {
  toasts: Toast[]
  addToast: (variant: ToastVariant, message: string) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (variant, message): void =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), variant, message }]
    })),
  removeToast: (id): void => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}))
