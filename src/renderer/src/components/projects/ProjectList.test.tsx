import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectList } from './ProjectList'

describe('project compatibility state', () => {
  it('reports an existing project whose application module is missing', async () => {
    vi.stubGlobal('api', { projects: { list: vi.fn().mockResolvedValue([{
      name: 'legacy-site',
      status: 'stopped',
      status_desc: 'Missing application module: legacy-cms',
      type: 'legacy-cms',
      approot: '/projects/legacy-site',
      shortroot: '/projects/legacy-site',
      docroot: '',
      primary_url: 'https://legacy-site.aurora.localhost',
      httpurl: 'http://legacy-site.aurora.localhost',
      httpsurl: 'https://legacy-site.aurora.localhost',
      mutagen_enabled: false,
      module_available: false,
      missing_module_id: 'legacy-cms'
    }]) } })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><ProjectList /></QueryClientProvider>)
    expect(await screen.findByText('Missing application module: legacy-cms')).toBeInTheDocument()
  })
})
