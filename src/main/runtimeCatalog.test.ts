import { describe, expect, it } from 'vitest'
import { findRuntimeUpdates, validateRuntimeCatalog } from './runtimeCatalog'

const checksum = 'a'.repeat(64)

describe('runtime catalog', () => {
  it('selects the newest compatible component release', () => {
    const catalog = validateRuntimeCatalog({ schema: 1, generatedAt: '2026-08-22T00:00:00.000Z', releases: [
      { component: 'php', version: '8.5.8', platform: 'linux', arch: 'x64', channel: 'stable', url: 'https://auroradockside.com/php-8.5.8.tar.zst', sha256: checksum },
      { component: 'php', version: '8.5.9', platform: 'linux', arch: 'x64', channel: 'security', url: 'https://auroradockside.com/php-8.5.9.tar.zst', sha256: checksum },
      { component: 'php', version: '8.6.0', platform: 'darwin', arch: 'arm64', channel: 'stable', url: 'https://auroradockside.com/php-8.6.0.tar.zst', sha256: checksum }
    ] })
    expect(findRuntimeUpdates(catalog, [{ id: 'php', version: '8.5.7', executable: 'bin/php', sha256: checksum }], 'linux', 'x64')).toEqual([
      { component: 'php', installedVersion: '8.5.7', availableVersion: '8.5.9', channel: 'security' }
    ])
  })

  it('rejects insecure release URLs', () => {
    expect(() => validateRuntimeCatalog({ schema: 1, generatedAt: 'now', releases: [{ component: 'php', version: '8.5.9', platform: 'linux', arch: 'x64', channel: 'stable', url: 'http://example.test/php', sha256: checksum }] })).toThrow('Invalid runtime catalog release')
  })
})
