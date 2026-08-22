import { describe, expect, it } from 'vitest'
import { validateNativeRuntimeManifest } from './nativeRuntime'

const valid = {
  schema: 1,
  runtimeVersion: '0.1.0',
  platform: 'linux',
  arch: 'x64',
  components: [
    { id: 'php', version: '8.4.12', executable: 'php/8.4/bin/php', sha256: 'a'.repeat(64) }
  ]
}

describe('Aurora Native runtime manifest', () => {
  it('accepts a signed-component-shaped platform manifest', () =>
    expect(validateNativeRuntimeManifest(valid)).toMatchObject(valid))
  it('rejects executable paths that escape the runtime', () =>
    expect(() =>
      validateNativeRuntimeManifest({
        ...valid,
        components: [{ ...valid.components[0], executable: '../php' }]
      })
    ).toThrow(/Unsafe executable path/))
  it('rejects malformed component checksums', () =>
    expect(() =>
      validateNativeRuntimeManifest({
        ...valid,
        components: [{ ...valid.components[0], sha256: 'bad' }]
      })
    ).toThrow(/checksum/))
})
