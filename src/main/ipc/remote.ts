import { dialog, ipcMain, safeStorage, type WebContents } from 'electron'
import { execFile } from 'child_process'
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'
import type { AuroraRemoteSiteProfile, AuroraRemoteSiteStatus } from '../../shared/types'
import { getProjectConfig, getProjectRoot } from '../auroraEngine'
import { runCommandStreamed } from '../commandRunner'

const execFileAsync = promisify(execFile)
const profilePath = (root: string): string => join(root, '.aurora', 'remote-site.json')
type StoredProfile = Omit<AuroraRemoteSiteProfile, 'applicationPassword' | 'configured'> & { encryptedApplicationPassword: string }

function validate(profile: AuroraRemoteSiteProfile): AuroraRemoteSiteProfile {
  let siteUrl: URL
  try { siteUrl = new URL(profile.siteUrl) } catch { throw new Error('Enter a valid production site URL.') }
  if (!['http:', 'https:'].includes(siteUrl.protocol)) throw new Error('The site URL must use HTTP or HTTPS.')
  if (!/^[a-zA-Z0-9.-]+$/.test(profile.sshHost)) throw new Error('Enter a valid SSH hostname.')
  if (!/^[a-zA-Z0-9._-]+$/.test(profile.sshUsername)) throw new Error('Enter a valid SSH username.')
  if (!Number.isInteger(profile.sshPort) || profile.sshPort < 1 || profile.sshPort > 65535) throw new Error('Enter a valid SSH port.')
  if (!/^\/[a-zA-Z0-9._/-]+$/.test(profile.remotePath)) throw new Error('The remote WordPress path must be absolute and contain only letters, numbers, dots, dashes, underscores, and slashes.')
  if (!profile.wordpressUsername.trim()) throw new Error('Enter the WordPress username used by the Application Password.')
  return { ...profile, siteUrl: siteUrl.origin, sshHost: profile.sshHost.trim(), sshUsername: profile.sshUsername.trim(), wordpressUsername: profile.wordpressUsername.trim(), remotePath: profile.remotePath.replace(/\/+$/, '') }
}

function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable on this computer.')
  return safeStorage.encryptString(value).toString('base64')
}

function decrypt(value: string): string {
  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

async function loadStored(root: string): Promise<StoredProfile | null> {
  try { return JSON.parse(await readFile(profilePath(root), 'utf8')) as StoredProfile } catch { return null }
}

async function save(root: string, input: AuroraRemoteSiteProfile): Promise<void> {
  const profile = validate(input)
  const existing = await loadStored(root)
  const password = profile.applicationPassword?.trim()
  const encryptedApplicationPassword = password ? encrypt(password) : existing?.encryptedApplicationPassword
  if (!encryptedApplicationPassword) throw new Error('Enter a WordPress Application Password.')
  const { applicationPassword: _removed, configured: _configured, ...publicProfile } = profile
  await mkdir(join(root, '.aurora'), { recursive: true })
  await writeFile(profilePath(root), JSON.stringify({ ...publicProfile, encryptedApplicationPassword }, null, 2) + '\n', { mode: 0o600 })
}

async function loadedProfile(root: string): Promise<AuroraRemoteSiteProfile> {
  const stored = await loadStored(root)
  if (!stored) throw new Error('Configure and save the remote site first.')
  const { encryptedApplicationPassword, ...profile } = stored
  return { ...profile, applicationPassword: decrypt(encryptedApplicationPassword), configured: true }
}

function sshArgs(profile: AuroraRemoteSiteProfile): string[] {
  return ['-p', String(profile.sshPort), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=12', '-o', 'StrictHostKeyChecking=accept-new', ...(profile.privateKeyPath ? ['-i', profile.privateKeyPath] : []), `${profile.sshUsername}@${profile.sshHost}`]
}

async function testConnector(profile: AuroraRemoteSiteProfile): Promise<AuroraRemoteSiteStatus> {
  const url = `${profile.siteUrl.replace(/\/$/, '')}/wp-json/aurora-dockside/v1/status`
  const auth = Buffer.from(`${profile.wordpressUsername}:${profile.applicationPassword ?? ''}`).toString('base64')
  const response = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(response.status === 401 ? 'WordPress rejected the username or Application Password.' : `Connector returned HTTP ${response.status}.`)
  const data = await response.json() as any
  if (data?.connector?.name !== 'Aurora Dockside Connector') throw new Error('The Aurora Dockside Connector did not return a valid response.')
  return { connected: true, platform: 'wordpress', siteName: String(data.site?.name ?? ''), siteUrl: String(data.site?.url ?? profile.siteUrl), wordpressVersion: String(data.runtime?.wordpress ?? ''), phpVersion: String(data.runtime?.php ?? ''), databaseVersion: String(data.runtime?.database ?? ''), connectorVersion: String(data.connector?.version ?? '') }
}

async function testSsh(profile: AuroraRemoteSiteProfile): Promise<void> {
  await execFileAsync('ssh', [...sshArgs(profile), 'test', '-d', profile.remotePath], { timeout: 15000, maxBuffer: 1024 * 1024 })
}

async function run(sender: WebContents, id: string, command: string, args: string[], cwd: string): Promise<void> {
  await runCommandStreamed(id, command, args, sender, { cwd, emitExit: false })
}

async function pullWordPress(sender: WebContents, operationId: string, name: string, root: string): Promise<void> {
  const profile = await loadedProfile(root)
  await testConnector(profile)
  await testSsh(profile)
  const config = await getProjectConfig(root)
  if (config.type !== 'wordpress') throw new Error('Remote pull currently supports WordPress projects only.')
  if (!['mysql', 'mariadb'].includes(config.database)) throw new Error('WordPress remote pull requires MySQL or MariaDB locally.')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = join(root, '.aurora', 'remote-backups', stamp)
  const dumpName = `aurora-${name}-${Date.now()}.sql`
  const remoteDump = `/tmp/${dumpName}`
  const localDump = join(backupDir, dumpName)
  await mkdir(backupDir, { recursive: true })
  await copyFile(join(root, '.aurora', 'config.json'), join(backupDir, 'config.json'))
  try {
    const compose = join(root, '.aurora', 'compose.yaml')
    await run(sender, operationId, 'tar', ['-czf', join(backupDir, 'site-files.tar.gz'), '--exclude=.aurora', '-C', root, '.'], root)
    await run(sender, operationId, 'docker', ['compose', '-f', compose, 'up', '-d', '--build', '--remove-orphans'], root)
    const dumpClient = config.database === 'mariadb' ? 'mariadb-dump' : 'mysqldump'
    await run(sender, operationId, 'docker', ['compose', '-f', compose, 'exec', '-T', 'db', 'sh', '-lc', `${dumpClient} -udb -pdb db > /tmp/aurora-local-before-pull.sql`], root)
    await run(sender, operationId, 'docker', ['compose', '-f', compose, 'cp', 'db:/tmp/aurora-local-before-pull.sql', join(backupDir, 'local-database.sql')], root)
    await run(sender, operationId, 'ssh', [...sshArgs(profile), 'wp', `--path=${profile.remotePath}`, 'db', 'export', remoteDump, '--add-drop-table'], root)
    const remote = `${profile.sshUsername}@${profile.sshHost}:${profile.remotePath}/`
    await run(sender, operationId, 'rsync', ['-az', '--human-readable', '--info=progress2', '-e', ['ssh', '-p', String(profile.sshPort), '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', ...(profile.privateKeyPath ? ['-i', profile.privateKeyPath] : [])].join(' '), '--exclude=.aurora/', '--exclude=wp-config.php', '--exclude=.htaccess', '--exclude=wp-content/cache/', '--exclude=wp-content/upgrade/', remote, `${root}/`], root)
    await run(sender, operationId, 'scp', ['-P', String(profile.sshPort), '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', ...(profile.privateKeyPath ? ['-i', profile.privateKeyPath] : []), `${profile.sshUsername}@${profile.sshHost}:${remoteDump}`, localDump], root)
    await run(sender, operationId, 'ssh', [...sshArgs(profile), 'rm', '-f', remoteDump], root)
    await run(sender, operationId, 'docker', ['compose', '-f', compose, 'cp', localDump, 'db:/tmp/aurora-pull.sql'], root)
    const databaseClient = config.database === 'mariadb' ? 'mariadb' : 'mysql'
    await run(sender, operationId, 'docker', ['compose', '-f', compose, 'exec', '-T', 'db', databaseClient, '-udb', '-pdb', 'db', '-e', 'source /tmp/aurora-pull.sql'], root)
    const uid = typeof process.getuid === 'function' ? process.getuid() : undefined
    const gid = typeof process.getgid === 'function' ? process.getgid() : undefined
    const wpBase = ['run', '--rm', ...(uid === undefined ? [] : ['--user', `${uid}:${gid}`]), '--network', `aurora-${name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}_default`, '-e', 'HOME=/tmp', '-v', `${root}:/app`, '-w', '/app', '--entrypoint', 'php', 'wordpress:cli', '/usr/local/bin/wp']
    await run(sender, operationId, 'docker', [...wpBase, 'search-replace', profile.siteUrl, `https://${name}.aurora.localhost`, '--all-tables-with-prefix', '--skip-columns=guid', '--precise'], root)
    await run(sender, operationId, 'docker', [...wpBase, 'cache', 'flush'], root)
    if (!sender.isDestroyed()) sender.send('terminal:exit', { operationId, exitCode: 0, cancelled: false })
  } catch (error) {
    try { await execFileAsync('ssh', [...sshArgs(profile), 'rm', '-f', remoteDump], { timeout: 10000 }) } catch { /* best effort cleanup */ }
    if (!sender.isDestroyed()) sender.send('terminal:exit', { operationId, exitCode: 1, cancelled: false })
    throw error
  }
}

export function registerRemoteIpc(): void {
  ipcMain.handle('remote:getProfile', async (_event, name: string) => {
    const root = await getProjectRoot(name)
    const stored = await loadStored(root)
    if (!stored) return null
    const { encryptedApplicationPassword: _secret, ...profile } = stored
    return { ...profile, applicationPassword: '', configured: true }
  })
  ipcMain.handle('remote:saveProfile', async (_event, name: string, profile: AuroraRemoteSiteProfile) => save(await getProjectRoot(name), profile))
  ipcMain.handle('remote:pickPrivateKey', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], title: 'Select SSH private key' })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('remote:test', async (_event, name: string, input: AuroraRemoteSiteProfile) => {
    const root = await getProjectRoot(name)
    await save(root, input)
    const profile = await loadedProfile(root)
    const status = await testConnector(profile)
    await testSsh(profile)
    return status
  })
  ipcMain.handle('remote:pull', async (event, operationId: string, name: string) => pullWordPress(event.sender, operationId, name, await getProjectRoot(name)))
}
