import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCookieHeader, clearCookieJar } from '../src/main/services/cookie-jar.service'
import { fetchWithCookieJar } from '../src/main/services/http-fetch.service'

describe('fetchWithCookieJar', () => {
  beforeEach(() => {
    clearCookieJar()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores cookies from redirect responses and sends them on the next hop', async () => {
    const calls: { url: string; headers: Record<string, string> }[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const headers = (init?.headers as Record<string, string>) || {}
        calls.push({ url, headers })

        if (url.includes('/login')) {
          return new Response(null, {
            status: 302,
            headers: {
              Location: 'https://api.example.com/home',
              'set-cookie': 'session=abc; Path=/; HttpOnly'
            }
          })
        }

        return new Response('ok', { status: 200 })
      }) as typeof fetch
    )

    const result = await fetchWithCookieJar('https://api.example.com/login', {
      method: 'GET',
      headers: {}
    })

    expect(result.response.status).toBe(200)
    expect(calls).toHaveLength(2)
    expect(calls[1]?.headers.Cookie).toBe('session=abc')
    expect(buildCookieHeader(new URL('https://api.example.com/users'))).toBe('session=abc')
  })

  it('sends stored cookies on later requests to the same domain', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const headers = (init?.headers as Record<string, string>) || {}

        if (url.includes('/login')) {
          return new Response('logged-in', {
            status: 200,
            headers: {
              'set-cookie': 'token=xyz; Path=/; HttpOnly; Secure'
            }
          })
        }

        expect(headers.Cookie).toBe('token=xyz')
        return new Response('ok', { status: 200 })
      }) as typeof fetch
    )

    await fetchWithCookieJar('https://api.example.com/login', { method: 'GET', headers: {} })
    await fetchWithCookieJar('https://api.example.com/profile', { method: 'GET', headers: {} })
  })
})
