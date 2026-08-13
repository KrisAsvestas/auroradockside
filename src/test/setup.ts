import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia; useAppliedTheme() relies on it to
// resolve the "system" theme.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }) as MediaQueryList
}
