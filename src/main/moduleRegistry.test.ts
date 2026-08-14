import { mkdtemp, mkdir, symlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/unused' } }))
import { getModuleRegistry, installModulePackage, uninstallModulePackage, validateModuleManifest } from './moduleRegistry'

const roots: string[] = []
async function temp(prefix: string): Promise<string> { const root = await mkdtemp(join(tmpdir(), prefix)); roots.push(root); return root }
const manifest = { id: 'sample-app', name: 'Sample', version: '1.0.0', category: 'application', description: 'test', aurora: { core: '2.0.0-alpha.24', moduleApi: '1.0.0' }, dependencies: [], conflicts: [], settings: [] }
async function packageDir(value = manifest): Promise<string> { const root = await temp('aurora-package-'); await writeFile(join(root, 'manifest.json'), JSON.stringify(value)); return root }

afterEach(async () => { const { rm } = await import('fs/promises'); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

describe('external module registry', () => {
  it('starts empty', async () => expect(await getModuleRegistry(await temp('aurora-user-'))).toEqual([]))
  it('installs a valid local package and refreshes after install', async () => {
    const userData = await temp('aurora-user-'); const source = await packageDir()
    await installModulePackage(source, userData)
    expect((await getModuleRegistry(userData)).map((item) => item.id)).toEqual(['sample-app'])
  })
  it('rejects invalid and incompatible manifests', () => {
    expect(() => validateModuleManifest({ ...manifest, id: '../escape' })).toThrow(/module id/)
    expect(() => validateModuleManifest({ ...manifest, aurora: { core: '9.0.0', moduleApi: '1.0.0' } })).toThrow(/requires Aurora Core/)
  })
  it('rejects symbolic links in package paths', async () => {
    const userData = await temp('aurora-user-'); const source = await packageDir(); await mkdir(join(source, 'main')); await symlink('/tmp', join(source, 'main', 'escape'))
    await expect(installModulePackage(source, userData)).rejects.toThrow(/symbolic links/)
  })
  it('refreshes after uninstall without touching source', async () => {
    const userData = await temp('aurora-user-'); const source = await packageDir(); await installModulePackage(source, userData); await uninstallModulePackage('sample-app', userData)
    expect(await getModuleRegistry(userData)).toEqual([])
    expect(await import('fs/promises').then(({ stat }) => stat(join(source, 'manifest.json')))).toBeTruthy()
  })
})
