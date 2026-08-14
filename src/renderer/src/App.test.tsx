import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

vi.stubGlobal('api', {
  projects: {
    list: vi.fn().mockResolvedValue([]),
    describe: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn()
  },
  terminal: {
    cancel: vi.fn(),
    onData: vi.fn().mockReturnValue(() => {}),
    onExit: vi.fn().mockReturnValue(() => {})
  }
})

function renderApp(): ReturnType<typeof render> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders the app title', () => {
    renderApp()
    expect(screen.getByText('Aurora Dockside')).toBeInTheDocument()
  })

  it('shows an empty state when there are no Aurora projects', async () => {
    renderApp()
    await waitFor(() => expect(screen.getByText(/No Aurora projects yet/)).toBeInTheDocument())
  })
})
