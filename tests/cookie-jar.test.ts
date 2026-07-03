import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyCookieHeader,
  buildCookieHeader,
  clearCookieJar,
  getMatchingCookies,
  parseSetCookieHeader,
  storeSetCookieHeaders
} from '../src/main/services/cookie-jar.service'

describe('Cookie jar', () => {
  beforeEach(() => {
    clearCookieJar()
  })

  it('parseSetCookieHeader — parses name, path, domain, max-age', () => {
    const cookie = parseSetCookieHeader(
      'session=abc123; Path=/api; Domain=.example.com; Max-Age=3600; Secure; HttpOnly',
      new URL('https://api.example.com/login')
    )

    expect(cookie).toMatchObject({
      name: 'session',
      value: 'abc123',
      domain: 'example.com',
      path: '/api',
      secure: true,
      httpOnly: true,
      hostOnly: false
    })
    expect(cookie?.expires).toBeGreaterThan(Date.now())
  })

  it('storeSetCookieHeaders + buildCookieHeader — sends cookie on same domain', () => {
    const loginUrl = new URL('https://api.example.com/login')
    storeSetCookieHeaders(['token=xyz; Path=/; Domain=.example.com'], loginUrl)

    const header = buildCookieHeader(new URL('https://api.example.com/users'))
    expect(header).toBe('token=xyz')
  })

  it('getMatchingCookies — respects path prefix', () => {
    storeSetCookieHeaders(['a=1; Path=/api'], new URL('https://example.com/api/login'))
    storeSetCookieHeaders(['b=2; Path=/other'], new URL('https://example.com/other'))

    const apiCookies = getMatchingCookies(new URL('https://example.com/api/users'))
    expect(apiCookies.map((c) => c.name)).toEqual(['a'])

    const otherCookies = getMatchingCookies(new URL('https://example.com/other/page'))
    expect(otherCookies.map((c) => c.name)).toEqual(['b'])
  })

  it('applyCookieHeader — merges with existing Cookie header', () => {
    storeSetCookieHeaders(['token=stored'], new URL('https://example.com/login'))

    const headers: Record<string, string> = { Cookie: 'manual=1' }
    applyCookieHeader(new URL('https://example.com/data'), headers)

    expect(headers.Cookie).toContain('token=stored')
    expect(headers.Cookie).toContain('manual=1')
  })

  it('getMatchingCookies — does not send secure cookie over http', () => {
    storeSetCookieHeaders(['secure=1; Secure'], new URL('https://example.com/login'))

    const cookies = getMatchingCookies(new URL('http://example.com/page'))
    expect(cookies).toHaveLength(0)
  })
})
