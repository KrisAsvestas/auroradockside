import { dialog, ipcMain } from 'electron'
import { createProject, getProjectConfigByRoot } from '../auroraEngine'
import { runCommandStreamed } from '../commandRunner'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { AURORA_ENV, ensureRouter, projectUrls, setWordpressMultisite } from '../auroraEngine'
import { saveSiteCredentials } from './secrets'
import type { AuroraStackOptions } from '../../shared/types'

const execFileAsync = promisify(execFile)
const safeName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'project'

async function hostUserArgs(): Promise<string[]> {
  if (process.platform === 'win32') return []
  try {
    const [{ stdout: uid }, { stdout: gid }] = await Promise.all([
      execFileAsync('id', ['-u'], { env: AURORA_ENV }),
      execFileAsync('id', ['-g'], { env: AURORA_ENV })
    ])
    return ['--user', `${uid.trim()}:${gid.trim()}`]
  } catch {
    return []
  }
}

async function wordpressBaseArgs(directory: string, network = false): Promise<string[]> {
  const userArgs = await hostUserArgs()
  const config = await getProjectConfigByRoot(directory)
  return [
    'run', '--rm',
    ...userArgs,
    '-e', 'HOME=/tmp',
    '-e', 'WP_CLI_CACHE_DIR=/tmp/wp-cli-cache',
    ...(network ? ['--network', `aurora-${safeName(config.name)}_default`] : []),
    '-v', `${directory}:/app`,
    '-w', '/app',
    '--entrypoint', 'php',
    'wordpress:cli',
    '-d', 'memory_limit=512M',
    '/usr/local/bin/wp'
  ]
}

async function currentProjectUrl(directory: string): Promise<string> {
  const config = await getProjectConfigByRoot(directory)
  await ensureRouter()
  // Aurora provisions WordPress with HTTPS as its canonical URL. WP-CLI writes
  // the URL directly and does not need to make a browser-trusted TLS request.
  return projectUrls(config.name).https
}


export function registerCreateIpc(): void {
  ipcMain.handle('create:pickDirectory', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('create:configure', async (_e, _id: string, directory: string, name: string, type: string, docroot: string, stack?: Partial<AuroraStackOptions>) =>
    createProject(directory, name, type, docroot, stack)
  )

  ipcMain.handle('create:downloadWordpress', async (e, id: string, directory: string, locale: string) => {
    const args = await wordpressBaseArgs(directory)
    return runCommandStreamed(
      id,
      'docker',
      [...args, 'core', 'download', `--locale=${locale || 'en_US'}`, '--force'],
      e.sender,
      { cwd: directory }
    )
  })

  ipcMain.handle(
    'create:setupWordpress',
    async (
      e,
      id: string,
      directory: string,
      _siteUrl: string,
      title: string,
      user: string,
      password: string,
      email: string,
      multisite: 'none' | 'subdirectory' | 'subdomain'
    ) => {
      const base = await wordpressBaseArgs(directory, true)
      const siteUrl = await currentProjectUrl(directory)

      // wp-config.php is generated against Docker's internal database hostname.
      await runCommandStreamed(
        `${id}-config`,
        'docker',
        [...base, 'config', 'create', '--dbname=db', '--dbuser=db', '--dbpass=db', '--dbhost=db:3306', '--skip-check', '--force'],
        e.sender,
        { cwd: directory }
      )

      // Always establish a known-good single-site installation first. Multisite
      // is a conversion step, not an alternate bootstrap path. This gives us a
      // populated database to verify before attempting network conversion.
      await runCommandStreamed(
        `${id}-install`,
        'docker',
        [
          ...base,
          'core', 'install',
          `--url=${siteUrl}`,
          `--title=${title}`,
          `--admin_user=${user}`,
          `--admin_password=${password}`,
          `--admin_email=${email}`,
          '--skip-email'
        ],
        e.sender,
        { cwd: directory }
      )

      // Hard gate #1: never continue from an empty/partial WordPress database.
      await runCommandStreamed(
        `${id}-verify-install`,
        'docker',
        [...base, 'core', 'is-installed'],
        e.sender,
        { cwd: directory }
      )

      if (multisite !== 'none') {
        const multisiteArgs = multisite === 'subdomain' ? ['--subdomains'] : []
        await runCommandStreamed(
          `${id}-multisite-convert`,
          'docker',
          [
            ...base,
            'core', 'multisite-convert',
            `--title=${title}`,
            ...multisiteArgs
          ],
          e.sender,
          { cwd: directory }
        )

        // Hard gate #2: a multisite project is not ready unless WP-CLI can see
        // the network installation. Any non-zero exit propagates to Dockside.
        await runCommandStreamed(
          `${id}-verify-network`,
          'docker',
          [...base, 'core', 'is-installed', '--network'],
          e.sender,
          { cwd: directory }
        )

        // Verify the network table itself as a second independent sanity check.
        await runCommandStreamed(
          `${id}-verify-network-db`,
          'docker',
          [...base, 'db', 'query', "SHOW TABLES LIKE 'wp_blogs';", '--skip-column-names'],
          e.sender,
          { cwd: directory }
        )
      }

      await setWordpressMultisite(directory, multisite)
      await ensureRouter()

      // Development-friendly defaults. Failure here should fail creation so the
      // user never gets a project Aurora claims is fully provisioned when it is not.
      await runCommandStreamed(
        `${id}-defaults`,
        'docker',
        [
          ...base,
          'rewrite', 'structure', '/%postname%/', '--hard'
        ],
        e.sender,
        { cwd: directory }
      )
      await runCommandStreamed(
        `${id}-debug`,
        'docker',
        [...base, 'config', 'set', 'WP_DEBUG', 'true', '--raw'],
        e.sender,
        { cwd: directory }
      )
      await runCommandStreamed(
        `${id}-env`,
        'docker',
        [...base, 'config', 'set', 'WP_ENVIRONMENT_TYPE', 'local'],
        e.sender,
        { cwd: directory }
      )

      // Store the original development login locally after every provisioning
      // gate has succeeded. WordPress stores only a password hash, so Aurora
      // must retain the original password if it is to display it later.
      await saveSiteCredentials(directory, {
        platform: 'wordpress',
        adminUrl: `${siteUrl.replace(/\/$/, '')}/wp-admin/`,
        username: user,
        password,
        email
      })
    }
  )

  ipcMain.handle('create:downloadDrupal', async (e, id: string, directory: string) =>
    runCommandStreamed(id, 'docker', ['run', '--rm', '-v', `${directory}:/app`, '-w', '/app', 'composer:2', 'create-project', 'drupal/recommended-project', '.', '--no-interaction'], e.sender, { cwd: directory })
  )
  ipcMain.handle('create:requireDrush', async (e, id: string, directory: string) =>
    runCommandStreamed(id, 'docker', ['run', '--rm', '-v', `${directory}:/app`, '-w', '/app', 'composer:2', 'require', 'drush/drush', '--no-interaction'], e.sender, { cwd: directory })
  )
  ipcMain.handle('create:setupDrupal', async () => {})
}
