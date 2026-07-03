import { describe, it, expect } from 'vitest'
import { parseCurl, exportToCurl } from '../src/main/services/curl.service'
import { sampleRequest } from './helpers'

describe('cURL service', () => {
  it('parseCurl — simple GET request', () => {
    const parsed = parseCurl("curl https://api.example.com/users")
    expect(parsed.method).toBe('GET')
    expect(parsed.url).toBe('https://api.example.com/users')
    expect(parsed.bodyType).toBe('none')
  })

  it('parseCurl — POST with JSON body auto-detects method', () => {
    const parsed = parseCurl(`curl https://api.example.com/users -d '{"name":"test"}'`)
    expect(parsed.method).toBe('POST')
    expect(parsed.bodyType).toBe('raw')
    expect(parsed.bodyRaw).toBe('{"name":"test"}')
    expect(parsed.bodyRawContentType).toBe('application/json')
  })

  it('parseCurl — explicit method and headers', () => {
    const parsed = parseCurl(
      "curl -X PUT https://api.example.com/users/1 -H 'Content-Type: application/json' -d '{\"id\":1}'"
    )
    expect(parsed.method).toBe('PUT')
    expect(parsed.headers?.some((h) => h.key === 'Content-Type')).toBe(true)
  })

  it('parseCurl — glued --data-raw= flag', () => {
    const parsed = parseCurl('curl --data-raw={"x":1} https://api.example.com')
    expect(parsed.bodyRaw).toContain('"x":1')
    expect(parsed.method).toBe('POST')
  })

  it('parseCurl — basic auth credentials', () => {
    const parsed = parseCurl('curl -u user:pass https://api.example.com')
    expect(parsed.authType).toBe('basic')
    expect(parsed.auth?.basicUsername).toBe('user')
    expect(parsed.auth?.basicPassword).toBe('pass')
  })

  it('parseCurl — bearer token from Authorization header', () => {
    const parsed = parseCurl(
      "curl https://api.example.com -H 'Authorization: Bearer my-token'"
    )
    expect(parsed.authType).toBe('bearer')
    expect(parsed.auth?.bearerToken).toBe('my-token')
  })

  it('parseCurl — form data fields', () => {
    const parsed = parseCurl("curl -F 'name=John' -F 'age=30' https://api.example.com")
    expect(parsed.bodyType).toBe('form-data')
    expect(parsed.formData).toHaveLength(2)
    expect(parsed.formData?.[0].key).toBe('name')
  })

  it('parseCurl — multiline with backslash continuation', () => {
    const parsed = parseCurl(`curl https://api.example.com \\
  -H 'Accept: application/json' \\
  -d '{"ok":true}'`)
    expect(parsed.url).toBe('https://api.example.com')
    expect(parsed.headers?.some((h) => h.key === 'Accept')).toBe(true)
    expect(parsed.bodyRaw).toContain('"ok":true')
  })

  it('exportToCurl — round-trip preserves URL and method', () => {
    const req = sampleRequest()
    const snippet = exportToCurl(req)
    expect(snippet).toContain('curl')
    expect(snippet).toContain('https://api.example.com/users')
    expect(snippet).toContain('-X POST')
    expect(snippet).toContain('Content-Type')
    expect(snippet).toContain('{"name":"test"}')
  })

  it('exportToCurl — includes bearer token', () => {
    const req = sampleRequest({
      authType: 'bearer',
      auth: { bearerToken: 'secret' }
    })
    const snippet = exportToCurl(req)
    expect(snippet).toContain('Authorization: Bearer secret')
  })
})
