import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist<ThemeState>(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
      }
    }),
    { name: 'aurora-dockside-theme' }
  )
)
