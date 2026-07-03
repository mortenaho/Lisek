import { describe, it, expect } from 'vitest'
import { substituteVariables, substituteKeyValues } from '../src/main/services/variable.service'
import { kv } from './helpers'

describe('Variable substitution service', () => {
  const envVars = [kv('host', 'api.example.com'), kv('port', '443')]
  const collectionVars = [kv('version', 'v1')]

  it('substituteVariables — replaces environment and collection vars', () => {
    const result = substituteVariables(
      'https://{{host}}/{{version}}/users',
      envVars,
      collectionVars
    )
    expect(result).toBe('https://api.example.com/v1/users')
  })

  it('substituteVariables — environment wins over collection', () => {
    const result = substituteVariables(
      '{{key}}',
      [kv('key', 'env')],
      [kv('key', 'col')]
    )
    expect(result).toBe('env')
  })

  it('substituteVariables — leaves unknown placeholders intact', () => {
    expect(substituteVariables('{{missing}}', envVars, [])).toBe('{{missing}}')
  })

  it('substituteVariables — replaces dynamic $timestamp', () => {
    const result = substituteVariables('{{$timestamp}}', [], [])
    expect(result).toMatch(/^\d+$/)
  })

  it('substituteVariables — replaces dynamic $randomUUID', () => {
    const result = substituteVariables('{{$randomUUID}}', [], [])
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('substituteKeyValues — substitutes both key and value fields', () => {
    const items = [kv('{{host}}', '{{port}}')]
    const result = substituteKeyValues(items, envVars, collectionVars)
    expect(result[0].key).toBe('api.example.com')
    expect(result[0].value).toBe('443')
  })
})
