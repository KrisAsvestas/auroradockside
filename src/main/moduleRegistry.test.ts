import { execFile } from 'child_process'
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'fs/promises'
import { promisify } from 'util'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/unused', getAppPath: () => '/unused/app' } }))
import { getAvailableModulePackages, getModuleRegistry, installModulePackage, uninstallModulePackage, validateModuleManifest } from './moduleRegistry'

const roots: string[] = []
const execFileAsync = promisify(execFile)
async function temp(prefix: string): Promise<string> { const root = await mkdtemp(join(tmpdir(), prefix)); roots.push(root); return root }
const manifest = { id: 'sample-app', name: 'Sample', version: '1.0.0', category: 'application', description: 'test', aurora: { core: '2.0.0-alpha.24', moduleApi: '1.0.0' }, dependencies: [], conflicts: [], settings: [] }
async function packageDir(value = manifest): Promise<string> { const root = await temp('aurora-package-'); await writeFile(join(root, 'manifest.json'), JSON.stringify(value)); return root }
async function pacFile(value = manifest): Promise<string> {
  const source = await packageDir(value)
  const output = join(await temp('aurora-pac-'), `${value.id}.pac`)
  await execFileAsync('zip', ['-qr', output, '.'], { cwd: source })
  return output
}

afterEach(async () => { const { rm } = await import('fs/promises'); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

describe('external module registry', () => {
  it('starts empty', async () => expect(await getModuleRegistry(await temp('aurora-user-'))).toEqual([]))
  it('lists discoverable packages for the module library', async () => {
    const catalog = await temp('aurora-catalog-'); const source = join(catalog, 'sample-app'); await mkdir(source); await writeFile(join(source, 'manifest.json'), JSON.stringify(manifest))
    process.env.AURORA_MODULE_PATH = catalog
    expect((await getAvailableModulePackages()).map((item) => item.manifest.id)).toContain('sample-app')
    delete process.env.AURORA_MODULE_PATH
  })
  it('discovers and installs a compressed .pac package', async () => {
    const catalog = await temp('aurora-catalog-')
    const pac = await pacFile()
    const catalogPac = join(catalog, 'sample-app.pac')
    await import('fs/promises').then(({ copyFile }) => copyFile(pac, catalogPac))
    process.env.AURORA_MODULE_PATH = catalog
    expect((await getAvailableModulePackages()).map((item) => item.manifest.id)).toContain('sample-app')
    delete process.env.AURORA_MODULE_PATH
    const userData = await temp('aurora-user-')
    const installed = await installModulePackage(catalogPac, userData)
    expect(installed.manifest.id).toBe('sample-app')
    expect((await getModuleRegistry(userData)).map((item) => item.id)).toEqual(['sample-app'])
  })
  it('discovers a .pac distributed beside the AppImage', async () => {
    const release = await temp('aurora-release-')
    const pac = await pacFile()
    await import('fs/promises').then(({ copyFile }) => copyFile(pac, join(release, 'sample-app.pac')))
    process.env.APPIMAGE = join(release, 'aurora-dockside.AppImage')
    expect((await getAvailableModulePackages()).map((item) => item.manifest.id)).toContain('sample-app')
    delete process.env.APPIMAGE
  })
  it('discovers a .pac embedded in the packaged application resources', async () => {
    const resources = await temp('aurora-resources-')
    const catalog = join(resources, 'module-catalog')
    await mkdir(catalog)
    const pac = await pacFile()
    await import('fs/promises').then(({ copyFile }) => copyFile(pac, join(catalog, 'sample-app.pac')))
    const previous = Object.getOwnPropertyDescriptor(process, 'resourcesPath')
    Object.defineProperty(process, 'resourcesPath', { value: resources, configurable: true })
    try {
      expect((await getAvailableModulePackages()).map((item) => item.manifest.id)).toContain('sample-app')
    } finally {
      if (previous) Object.defineProperty(process, 'resourcesPath', previous)
      else Reflect.deleteProperty(process, 'resourcesPath')
    }
  })
  it('installs a valid local package and refreshes after install', async () => {
    const userData = await temp('aurora-user-'); const source = await packageDir()
    await installModulePackage(source, userData)
    expect((await getModuleRegistry(userData)).map((item) => item.id)).toEqual(['sample-app'])
  })
  it('rejects invalid and incompatible manifests', () => {
    expect(() => validateModuleManifest({ ...manifest, id: '../escape' })).toThrow(/module id/)
    expect(() => validateModuleManifest({ ...manifest, aurora: { core: '9.0.0', moduleApi: '1.0.0' } })).toThrow(/requires Aurora Core/)
    expect(() => validateModuleManifest({ ...manifest, main: '../outside.cjs' })).toThrow(/may not leave/)
    expect(() => validateModuleManifest({ ...manifest, dependencies: ['../escape'] })).toThrow(/module id array/)
    expect(() => validateModuleManifest({ ...manifest, project: { adminPath: 'admin' } })).toThrow(/must start with/)
    expect(() => validateModuleManifest({ ...manifest, creation: { phpVersions: ['latest'] } })).toThrow(/PHP minor versions/)
  })
  it('rejects symbolic links in package paths', async () => {
    const userData = await temp('aurora-user-'); const source = await packageDir(); await mkdir(join(source, 'main')); await symlink('/tmp', join(source, 'main', 'escape'))
    await expect(installModulePackage(source, userData)).rejects.toThrow(/symbolic links/)
  })
  it('rejects symbolic links and traversal paths inside .pac archives', async () => {
    const userData = await temp('aurora-user-')
    const linkedSource = await packageDir()
    await symlink('/tmp', join(linkedSource, 'escape'))
    const linkedPac = join(await temp('aurora-pac-'), 'linked.pac')
    await execFileAsync('zip', ['-qry', linkedPac, '.'], { cwd: linkedSource })
    await expect(installModulePackage(linkedPac, userData)).rejects.toThrow(/symbolic links/)

    const traversalSource = await packageDir()
    await mkdir(join(traversalSource, 'xx'))
    await writeFile(join(traversalSource, 'xx', 'evil'), 'unsafe')
    const traversalPac = join(await temp('aurora-pac-'), 'traversal.pac')
    await execFileAsync('zip', ['-qr', traversalPac, '.'], { cwd: traversalSource })
    const archive = await readFile(traversalPac)
    const original = Buffer.from('xx/evil')
    const unsafe = Buffer.from('../evil')
    for (let offset = archive.indexOf(original); offset !== -1; offset = archive.indexOf(original, offset + unsafe.length)) unsafe.copy(archive, offset)
    await writeFile(traversalPac, archive)
    await expect(installModulePackage(traversalPac, userData)).rejects.toThrow(/(?:Unsafe \.pac entry path|invalid relative path)/)
  })
  it('refreshes after uninstall without touching source', async () => {
    const userData = await temp('aurora-user-'); const source = await packageDir(); await installModulePackage(source, userData); await uninstallModulePackage('sample-app', userData)
    expect(await getModuleRegistry(userData)).toEqual([])
    expect(await import('fs/promises').then(({ stat }) => stat(join(source, 'manifest.json')))).toBeTruthy()
  })

  it('updates an installed package atomically at the same registry id', async () => {
    const userData = await temp('aurora-user-')
    await installModulePackage(await packageDir(), userData)
    await installModulePackage(await packageDir({ ...manifest, version: '1.1.0' }), userData)
    expect((await getModuleRegistry(userData)).map((item) => item.version)).toEqual(['1.1.0'])
  })

  it('uninstalls only the package and preserves existing project data', async () => {
    const userData = await temp('aurora-user-')
    const project = await temp('aurora-project-')
    const sentinel = join(project, 'site-content.txt')
    await writeFile(sentinel, 'keep me')
    await installModulePackage(await packageDir(), userData)
    await uninstallModulePackage('sample-app', userData)
    expect(await readFile(sentinel, 'utf8')).toBe('keep me')
  })

  it('accepts the independently packaged WordPress module contract', async () => {
    const packageRoot = resolve(process.cwd(), 'packages/aurora-module-wordpress')
    const actual = JSON.parse(await readFile(join(packageRoot, 'manifest.json'), 'utf8'))
    expect(validateModuleManifest(actual).id).toBe('wordpress')
    const archive = join(await temp('aurora-pac-'), 'wordpress.pac')
    await execFileAsync('zip', ['-qr', archive, '.'], { cwd: packageRoot })
    const userData = await temp('aurora-user-')
    expect((await installModulePackage(archive, userData)).manifest.id).toBe('wordpress')
    expect((await getModuleRegistry(userData)).map((item) => item.id)).toEqual(['wordpress'])
  })

  it('accepts and packages the Drupal application module contract', async () => {
    const packageRoot = resolve(process.cwd(), 'packages/aurora-module-drupal')
    const actual = JSON.parse(await readFile(join(packageRoot, 'manifest.json'), 'utf8'))
    expect(validateModuleManifest(actual)).toMatchObject({ id: 'drupal', defaults: { docroot: 'web' } })
    const archive = join(await temp('aurora-pac-'), 'drupal.pac')
    await execFileAsync('zip', ['-qr', archive, '.'], { cwd: packageRoot })
    const userData = await temp('aurora-user-')
    expect((await installModulePackage(archive, userData)).manifest.id).toBe('drupal')
  })
})
