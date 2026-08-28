import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuroraModuleManifest } from '@shared/types'
import { CreateProjectModal } from './CreateProjectModal'

const wordpress: AuroraModuleManifest = {
  id: 'wordpress',
  name: 'WordPress',
  version: '1.2.0',
  category: 'application',
  description: 'CMS',
  dependencies: [],
  conflicts: [],
  settings: [],
  aurora: { core: '2.0.0-alpha.24', moduleApi: '1.0.0' }
}

function renderModal(
  modules: AuroraModuleManifest[],
  nativeAvailable = false
): { queryClient: QueryClient } {
  vi.stubGlobal('api', {
    modules: { listRegistry: vi.fn().mockResolvedValue(modules) },
    runtime: {
      status: vi.fn().mockResolvedValue({
        selectedEngine: nativeAvailable ? 'native' : 'container',
        container: { available: false, provider: null },
        native: {
          available: nativeAvailable,
          platform: 'win32',
          arch: 'x64',
          runtimeVersion: nativeAvailable ? '0.1.0' : undefined,
          components: nativeAvailable
            ? [{ id: 'php', version: '8.5.9', executable: 'php.exe', sha256: 'a'.repeat(64) }]
            : []
        }
      })
    },
    create: { pickDirectory: vi.fn(), project: vi.fn() },
    terminal: {
      onData: vi.fn().mockReturnValue(() => {}),
      onExit: vi.fn().mockReturnValue(() => {})
    }
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CreateProjectModal onClose={vi.fn()} />
    </QueryClientProvider>
  )
  return { queryClient }
}

describe('external application choices', () => {
  it('shows the module-install route when the registry is empty', async () => {
    renderModal([])
    expect(await screen.findByText('No application modules installed')).toBeInTheDocument()
    expect(screen.getByText(/bottom of the sidebar/)).toBeInTheDocument()
  })

  it('adds and removes an installed application without rebuilding Core', async () => {
    const { queryClient } = renderModal([wordpress])
    expect(await screen.findByText('WordPress')).toBeInTheDocument()
    queryClient.setQueryData(['modules', 'registry'], [])
    await waitFor(() => expect(screen.queryByText('WordPress')).not.toBeInTheDocument())
    expect(screen.getByText('No application modules installed')).toBeInTheDocument()
  })

  it('defaults to Aurora Native when the bundled runtime is ready', async () => {
    renderModal([wordpress], true)
    const native = await screen.findByRole('button', { name: /Aurora Native/i })
    await waitFor(() => expect(native.className).toContain('border-cyan-400'))
    expect(screen.getByLabelText('PHP')).toHaveValue('8.5')
  })
})
