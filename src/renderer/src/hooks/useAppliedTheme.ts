import { useEffect } from 'react'
import { useThemeStore } from '../stores/themeStore'

// Applies the resolved theme (light/dark/system) to <html class="dark">,
// which is what the `@custom-variant dark` rule in main.css keys off. Must
// run somewhere mounted once near the app root.
export function useAppliedTheme(): void {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = (): void => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', isDark)
    }

    apply()

    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    return undefined
  }, [theme])
}
