import { app } from 'electron'
import { createPublicKey, verify } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type {
  AuroraNativeRuntimeComponent,
  AuroraRuntimeCatalog,
  AuroraRuntimeCatalogRelease,
  AuroraRuntimeUpdate,
  AuroraRuntimeUpdateStatus
} from '../shared/types'

const catalogUrl =
  process.env.AURORA_RUNTIME_CATALOG_URL || 'https://auroradockside.com/runtime/catalog.json'
const publicKeyPem = process.env.AURORA_RUNTIME_CATALOG_PUBLIC_KEY

function compareVersions(left: string, right: string): number {
  const a = left.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
  const b = right.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0)
  }
  return 0
}

export function validateRuntimeCatalog(value: unknown): AuroraRuntimeCatalog {
  if (!value || typeof value !== 'object') throw new Error('Runtime catalog must be an object.')
  const catalog = value as Record<string, unknown>
  if (
    catalog.schema !== 1 ||
    typeof catalog.generatedAt !== 'string' ||
    !Array.isArray(catalog.releases)
  )
    throw new Error('Unsupported runtime catalog.')
  const releases = catalog.releases.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid runtime catalog release.')
    const release = entry as Record<string, unknown>
    if (
      ![
        'php',
        'nginx',
        'apache',
        'mariadb',
        'mariadb-client',
        'mariadb-dump',
        'mysql',
        'postgres',
        'node',
        'composer',
        'wp-cli',
        'drush',
        'adminer'
      ].includes(String(release.component)) ||
      typeof release.version !== 'string' ||
      !['linux', 'darwin', 'win32'].includes(String(release.platform)) ||
      !['x64', 'arm64'].includes(String(release.arch)) ||
      !['stable', 'security'].includes(String(release.channel)) ||
      typeof release.url !== 'string' ||
      !release.url.startsWith('https://') ||
      typeof release.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(release.sha256)
    )
      throw new Error('Invalid runtime catalog release.')
    return release as unknown as AuroraRuntimeCatalogRelease
  })
  return { schema: 1, generatedAt: catalog.generatedAt, releases }
}

export function findRuntimeUpdates(
  catalog: AuroraRuntimeCatalog,
  installed: AuroraNativeRuntimeComponent[],
  platform: NodeJS.Platform,
  arch: string
): AuroraRuntimeUpdate[] {
  return installed.flatMap((component) => {
    const candidates = catalog.releases.filter(
      (release) =>
        release.component === component.id && release.platform === platform && release.arch === arch
    )
    const latest = candidates.sort((a, b) => compareVersions(b.version, a.version))[0]
    return latest && compareVersions(latest.version, component.version) > 0
      ? [
          {
            component: component.id,
            installedVersion: component.version,
            availableVersion: latest.version,
            channel: latest.channel
          }
        ]
      : []
  })
}

function bundledCatalogPath(): string {
  return join(app.getAppPath(), 'resources', 'runtime-catalog', 'catalog.json')
}

async function remoteCatalog(): Promise<AuroraRuntimeCatalog> {
  if (!publicKeyPem) throw new Error('Remote runtime catalog verification is not configured yet.')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const [catalogResponse, signatureResponse] = await Promise.all([
      fetch(catalogUrl, { signal: controller.signal }),
      fetch(`${catalogUrl}.sig`, { signal: controller.signal })
    ])
    if (!catalogResponse.ok || !signatureResponse.ok)
      throw new Error('Runtime catalog server is unavailable.')
    const body = Buffer.from(await catalogResponse.arrayBuffer())
    const signature = Buffer.from((await signatureResponse.text()).trim(), 'base64')
    if (!verify(null, body, createPublicKey(publicKeyPem), signature))
      throw new Error('Runtime catalog signature is invalid.')
    return validateRuntimeCatalog(JSON.parse(body.toString('utf8')))
  } finally {
    clearTimeout(timer)
  }
}

export async function getRuntimeUpdates(
  installed: AuroraNativeRuntimeComponent[]
): Promise<AuroraRuntimeUpdateStatus> {
  const cacheDirectory = join(app.getPath('userData'), 'runtime-catalog')
  const cachePath = join(cacheDirectory, 'catalog.json')
  let source: AuroraRuntimeUpdateStatus['source'] = 'bundled'
  let message: string | undefined
  let catalog: AuroraRuntimeCatalog
  try {
    catalog = await remoteCatalog()
    source = 'remote'
    await mkdir(cacheDirectory, { recursive: true })
    await writeFile(cachePath, JSON.stringify(catalog, null, 2), 'utf8')
  } catch (error) {
    message = error instanceof Error ? error.message : 'Runtime update check failed.'
    try {
      catalog = validateRuntimeCatalog(JSON.parse(await readFile(cachePath, 'utf8')))
      source = 'cache'
    } catch {
      catalog = validateRuntimeCatalog(JSON.parse(await readFile(bundledCatalogPath(), 'utf8')))
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    source,
    updates: findRuntimeUpdates(catalog, installed, process.platform, process.arch),
    message
  }
}
