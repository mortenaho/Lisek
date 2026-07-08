import { describe, expect, it } from 'vitest'
import { maskSecretKeyValues, maskSecretValue } from '../shared/secretExport'
import { kv } from './helpers'

describe('secretExport', () => {
  it('masks secret values in export lists', () => {
    const items = [kv('apiKey', 'secret-123'), { ...kv('baseUrl', 'http://localhost'), secret: true, value: 'hidden' }]
    const masked = maskSecretKeyValues(items)
    expect(masked[0].value).toBe('secret-123')
    expect(masked[1].value).toBe('')
    expect(maskSecretValue(items[1])).toBe('')
  })
})
