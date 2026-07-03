import { describe, it, expect } from 'vitest'
import {
  buildVariableMap,
  resolveVariable,
  parseVariableSegments,
  getVariableAtIndex,
  getAutocompleteContext,
  collectVariableNames
} from '../src/renderer/utils/variables'
import { kv } from './helpers'

describe('Variable utilities', () => {
  const envVars = [kv('baseUrl', 'https://api.test.com')]
  const collectionVars = [kv('token', 'abc123')]

  it('buildVariableMap — environment overrides collection on key clash', () => {
    const both = [kv('key', 'from-col'), kv('key', 'from-env')]
    const map = buildVariableMap([both[1]], [both[0]])
    expect(map.get('key')).toBe('from-env')
  })

  it('buildVariableMap — skips disabled variables', () => {
    const map = buildVariableMap([kv('x', '1', false)], [])
    expect(map.has('x')).toBe(false)
  })

  it('resolveVariable — finds environment variable', () => {
    expect(resolveVariable('baseUrl', envVars, collectionVars)).toEqual({
      source: 'environment',
      value: 'https://api.test.com'
    })
  })

  it('resolveVariable — finds collection variable', () => {
    expect(resolveVariable('token', envVars, collectionVars)).toEqual({
      source: 'collection',
      value: 'abc123'
    })
  })

  it('resolveVariable — detects dynamic variables', () => {
    expect(resolveVariable('$timestamp', [], []).source).toBe('dynamic')
  })

  it('resolveVariable — unknown variable', () => {
    expect(resolveVariable('missing', envVars, []).source).toBe('unknown')
  })

  it('parseVariableSegments — splits text and variables', () => {
    const segments = parseVariableSegments('{{baseUrl}}/users/{{token}}', envVars, collectionVars)
    expect(segments).toHaveLength(3)
    expect(segments[0]).toMatchObject({ type: 'variable', name: 'baseUrl', source: 'environment' })
    expect(segments[1]).toMatchObject({ type: 'text', content: '/users/' })
    expect(segments[2]).toMatchObject({ type: 'variable', name: 'token', source: 'collection' })
  })

  it('getVariableAtIndex — returns variable at cursor position', () => {
    const text = 'GET {{baseUrl}}/path'
    const idx = text.indexOf('baseUrl')
    expect(getVariableAtIndex(text, idx)?.name).toBe('baseUrl')
  })

  it('getAutocompleteContext — detects incomplete {{', () => {
    const text = 'https://{{bas'
    const ctx = getAutocompleteContext(text, text.length)
    expect(ctx).toEqual({ query: 'bas', replaceStart: 10, replaceEnd: 13 })
  })

  it('collectVariableNames — merges and sorts names', () => {
    expect(collectVariableNames(envVars, collectionVars)).toEqual(['baseUrl', 'token'])
  })
})
