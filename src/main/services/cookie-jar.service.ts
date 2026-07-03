import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { CookieRecord, KeyValue } from '../../../shared/types'

const jar: CookieRecord[] = []
let persistPath: string | null = null

function normalizeDomain(domain: string): string {
  return domain.replace(/^\./, '').toLowerCase()
}

function domainMatches(requestHost: string, cookie: CookieRecord): boolean {
  const host = requestHost.toLowerCase()
  const domain = cookie.domain.toLowerCase()
  if (cookie.hostOnly) return host === domain
  return host === domain || host.endsWith(`.${domain}`)
}

function pathMatches(requestPath: string, cookiePath: string): boolean {
  if (!requestPath.startsWith(cookiePath)) return false
  if (cookiePath === '/') return true
  return requestPath === cookiePath || requestPath.startsWith(`${cookiePath}/`)
}

function isExpired(cookie: CookieRecord, now = Date.now()): boolean {
  return cookie.expires !== undefined && cookie.expires <= now
}

export function parseSetCookieHeader(setCookie: string, requestUrl: URL): CookieRecord | null {
  const trimmed = setCookie.trim()
  if (!trimmed) return null

  const segments = trimmed.split(/;\s*/)
  const nameValue = segments[0]
  const eq = nameValue.indexOf('=')
  if (eq <= 0) return null

  const name = nameValue.slice(0, eq).trim()
  const value = nameValue.slice(eq + 1).trim()
  if (!name) return null

  let path = '/'
  let domain = requestUrl.hostname
  let hostOnly = true
  let secure = requestUrl.protocol === 'https:'
  let httpOnly = false
  let expires: number | undefined

  for (const part of segments.slice(1)) {
    const idx = part.indexOf('=')
    const key = (idx === -1 ? part : part.slice(0, idx)).trim().toLowerCase()
    const val = idx === -1 ? '' : part.slice(idx + 1).trim()

    if (key === 'path' && val) path = val.startsWith('/') ? val : `/${val}`
    else if (key === 'domain' && val) {
      domain = normalizeDomain(val)
      hostOnly = false
    } else if (key === 'secure') secure = true
    else if (key === 'httponly') httpOnly = true
    else if (key === 'max-age') {
      const seconds = Number.parseInt(val, 10)
      if (!Number.isNaN(seconds)) expires = Date.now() + seconds * 1000
    } else if (key === 'expires' && val) {
      const ts = Date.parse(val)
      if (!Number.isNaN(ts)) expires = ts
    }
  }

  return { name, value, domain, path, secure, httpOnly, hostOnly, expires }
}

function cookieKey(cookie: CookieRecord): string {
  return `${cookie.domain}|${cookie.path}|${cookie.name}`
}

export function storeSetCookieHeaders(setCookies: string[], requestUrl: URL): CookieRecord[] {
  const stored: CookieRecord[] = []

  for (const header of setCookies) {
    const parsed = parseSetCookieHeader(header, requestUrl)
    if (!parsed) continue

    const key = cookieKey(parsed)
    const index = jar.findIndex((c) => cookieKey(c) === key)
    if (index >= 0) jar[index] = parsed
    else jar.push(parsed)
    stored.push(parsed)
  }

  if (stored.length > 0) persistJar()
  return stored
}

export function getMatchingCookies(url: URL, now = Date.now()): CookieRecord[] {
  const isHttps = url.protocol === 'https:'
  const path = url.pathname || '/'

  return jar.filter((cookie) => {
    if (isExpired(cookie, now)) return false
    if (cookie.secure && !isHttps) return false
    if (!domainMatches(url.hostname, cookie)) return false
    if (!pathMatches(path, cookie.path)) return false
    return true
  })
}

export function buildCookieHeader(url: URL): string | null {
  const cookies = getMatchingCookies(url)
  if (cookies.length === 0) return null
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

function parseCookieHeader(header: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim())
  }
  return map
}

export function applyCookieHeader(url: URL, headers: Record<string, string>): void {
  const jarHeader = buildCookieHeader(url)
  if (!jarHeader) return

  const existingKey = Object.keys(headers).find((k) => k.toLowerCase() === 'cookie')
  if (!existingKey) {
    headers.Cookie = jarHeader
    return
  }

  const merged = parseCookieHeader(jarHeader)
  for (const [name, value] of parseCookieHeader(headers[existingKey])) {
    merged.set(name, value)
  }
  headers[existingKey] = [...merged.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

export function cookiesToKeyValues(cookies: CookieRecord[]): KeyValue[] {
  return cookies.map((c, i) => ({
    id: String(i + 1),
    key: c.name,
    value: c.value,
    enabled: true
  }))
}

export function extractSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }
  const single = response.headers.get('set-cookie')
  return single ? [single] : []
}

export function configureCookieJar(path: string): void {
  persistPath = path
  loadCookieJar()
}

function loadCookieJar(): void {
  if (!persistPath || !existsSync(persistPath)) return
  try {
    const parsed = JSON.parse(readFileSync(persistPath, 'utf-8')) as CookieRecord[]
    jar.splice(0, jar.length, ...parsed.filter((c) => c.name && c.domain))
  } catch {
    jar.splice(0, jar.length)
  }
}

function persistJar(): void {
  if (!persistPath) return
  mkdirSync(dirname(persistPath), { recursive: true })
  const active = jar.filter((c) => !isExpired(c))
  jar.splice(0, jar.length, ...active)
  writeFileSync(persistPath, JSON.stringify(jar, null, 2), 'utf-8')
}

export function clearCookieJar(): void {
  jar.splice(0, jar.length)
  persistJar()
}

export function clearCookiesByDomain(domain: string): void {
  const normalized = domain.replace(/^\./, '').toLowerCase()
  const remaining = jar.filter((c) => c.domain.toLowerCase() !== normalized)
  jar.splice(0, jar.length, ...remaining)
  persistJar()
}

export function listStoredCookies(): CookieRecord[] {
  return jar.filter((c) => !isExpired(c))
}