import { describe, expect, it } from 'vitest'
import { compareVersions, isNewerVersion, normalizeVersion } from '../shared/semver'

describe('semver', () => {
  it('normalizeVersion strips v prefix and prerelease', () => {
    expect(normalizeVersion('v1.6.1')).toBe('1.6.1')
    expect(normalizeVersion('1.6.1-beta.1')).toBe('1.6.1')
    expect(normalizeVersion('  V2.0.0+build ')).toBe('2.0.0')
  })

  it('compareVersions orders correctly', () => {
    expect(compareVersions('1.6.2', '1.6.1')).toBe(1)
    expect(compareVersions('1.6.1', '1.6.2')).toBe(-1)
    expect(compareVersions('v1.6.1', '1.6.1')).toBe(0)
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1)
  })

  it('isNewerVersion', () => {
    expect(isNewerVersion('1.7.0', '1.6.1')).toBe(true)
    expect(isNewerVersion('1.6.1', '1.6.1')).toBe(false)
    expect(isNewerVersion('1.6.0', '1.6.1')).toBe(false)
  })
})
