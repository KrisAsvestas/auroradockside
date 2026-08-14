import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist<ThemeState>(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
      }
    }),
    {
      name: 'aurora-dockside-theme',
      version: 1,
      migrate: (persisted) => {
        const previous = persisted as Partial<ThemeState>
        return { ...previous, theme: previous.theme === 'light' ? 'light' : 'dark' } as ThemeState
      }
    }
  )
)
