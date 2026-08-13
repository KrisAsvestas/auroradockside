import { ipcMain } from 'electron'
import { runCommandStreamed } from '../commandRunner'
import { getProjectConfig, getProjectRoot } from '../auroraEngine'

const safeName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'project'

function wpDockerArgs(name: string, root: string, wpArgs: string[]): string[] {
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined
  const gid = typeof process.getgid === 'function' ? process.getgid() : undefined
  const userArgs = uid !== undefined && gid !== undefined ? ['--user', `${uid}:${gid}`] : []

  return [
    'run', '--rm',
    ...userArgs,
    '--network', `aurora-${safeName(name)}_default`,
    '-e', 'HOME=/tmp',
    '-e', 'WP_CLI_CACHE_DIR=/tmp/wp-cli-cache',
    '-v', `${root}:/app`,
    '-w', '/app',
    'wordpress:cli',
    ...wpArgs
  ]
}

export function registerWordpressIpc(): void {
  ipcMain.handle('wordpress:run', async (event, operationId: string, name: string, action: string, payload?: string) => {
    const root = await getProjectRoot(name)
    const config = await getProjectConfig(root)
    if (config.type !== 'wordpress') throw new Error(`Project '${name}' is not a WordPress project`)

    let args: string[]
    switch (action) {
      case 'cache-flush': args = ['cache', 'flush']; break
      case 'rewrite-flush': args = ['rewrite', 'flush']; break
      case 'maintenance-on': args = ['maintenance-mode', 'activate']; break
      case 'maintenance-off': args = ['maintenance-mode', 'deactivate']; break
      case 'debug-on': args = ['config', 'set', 'WP_DEBUG', 'true', '--raw']; break
      case 'debug-off': args = ['config', 'set', 'WP_DEBUG', 'false', '--raw']; break
      case 'core-version': args = ['core', 'version']; break
      case 'plugin-list': args = ['plugin', 'list']; break
      case 'theme-list': args = ['theme', 'list']; break
      case 'search-replace': {
        const [from, to] = (payload ?? '').split('\n')
        if (!from || !to) throw new Error('Search and replacement values are required')
        args = ['search-replace', from, to, '--all-tables-with-prefix', '--precise', '--report-changed-only']
        if (config.wordpressMultisite && config.wordpressMultisite !== 'none') args.push('--network')
        break
      }
      default: throw new Error(`Unknown WordPress action '${action}'`)
    }

    return runCommandStreamed(operationId, 'docker', wpDockerArgs(name, root, args), event.sender, { cwd: root })
  })
}
