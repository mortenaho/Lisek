import { describe, it, expect } from 'vitest'
import { APP_INFO } from '../shared/appInfo'
import packageJson from '../package.json'

describe('Application metadata', () => {
  it('APP_INFO — has required fields', () => {
    expect(APP_INFO.name).toBe('Lisek')
    expect(APP_INFO.author).toBe('Seyed Morteza Hosseini')
    expect(APP_INFO.email).toBe('mortenaho@gmail.com')
    expect(APP_INFO.website).toBe('https://mortenaho.ir')
  })

  it('package.json — version is semver-like', () => {
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('package.json — author matches APP_INFO', () => {
    expect(packageJson.author).toContain(APP_INFO.email)
    expect(packageJson.author).toContain('mortenaho.ir')
  })
})
