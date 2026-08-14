import { describe, expect, it } from 'vitest'
import { compareVersions } from './updater'

describe('update version comparison', () => {
  it('detects newer module versions', () => {
    expect(compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0)
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0)
    expect(compareVersions('1.1.9', '1.2.0')).toBeLessThan(0)
  })
})
