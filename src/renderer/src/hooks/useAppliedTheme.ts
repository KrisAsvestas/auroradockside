import { useEffect } from 'react'
import { useThemeStore } from '../stores/themeStore'

// Applies the selected light/dark theme to <html class="dark">,
// which is what the `@custom-variant dark` rule in main.css keys off. Must
// run somewhere mounted once near the app root.
export function useAppliedTheme(): void {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])
}
