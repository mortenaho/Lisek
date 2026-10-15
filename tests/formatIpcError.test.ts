import { describe, expect, it } from 'vitest'
import { formatIpcError } from '../src/renderer/utils/formatIpcError'

describe('formatIpcError', () => {
  it('strips Electron IPC wrapper and error name', () => {
    expect(
      formatIpcError(new Error("Error invoking remote method 'request:send': TypeError: Invalid URL"))
    ).toBe('Invalid URL')
  })

  it('strips Error: prefix from IPC-wrapped messages', () => {
    expect(
      formatIpcError(new Error("Error invoking remote method 'request:send': Error: Connection refused"))
    ).toBe('Connection refused')
  })

  it('passes through plain messages', () => {
    expect(formatIpcError(new Error('fetch failed'))).toBe('fetch failed')
  })

  it('handles string errors', () => {
    expect(formatIpcError("Error invoking remote method 'import:url': Error: URL is required")).toBe(
      'URL is required'
    )
  })
})
