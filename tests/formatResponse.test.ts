import { describe, it, expect } from 'vitest'
import type { HttpResponse } from '../shared/types'
import {
  defaultResponseDownloadName,
  formatFullResponseText,
  serializeFullResponse
} from '../src/renderer/utils/formatResponse'

const sampleResponse: HttpResponse = {
  statusCode: 200,
  statusText: 'OK',
  headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'abc' },
  body: '{"ok":true}',
  durationMs: 42,
  sizeBytes: 13,
  cookies: [{ id: '1', key: 'session', value: 'token123', enabled: true }]
}

describe('formatResponse utilities', () => {
  it('formatFullResponseText — includes status, headers, cookies, and body', () => {
    const text = formatFullResponseText(sampleResponse)
    expect(text).toContain('Status: 200 OK')
    expect(text).toContain('Content-Type: application/json')
    expect(text).toContain('session=token123')
    expect(text).toContain('{"ok":true}')
  })

  it('serializeFullResponse — returns pretty JSON', () => {
    const json = serializeFullResponse(sampleResponse)
    expect(JSON.parse(json)).toEqual(sampleResponse)
  })

  it('defaultResponseDownloadName — uses status code', () => {
    expect(defaultResponseDownloadName(sampleResponse)).toBe('response-200.json')
  })
})
