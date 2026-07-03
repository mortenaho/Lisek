import fs from 'fs'
import type { AuthType, HttpMethod, KeyValue, RequestModel } from '../../../shared/types'

const DATA_FLAGS = new Set([
  '-d',
  '--data',
  '--data-raw',
  '--data-binary',
  '--data-urlencode',
  '--data-ascii'
])

const VALUE_FLAGS = new Set([
  ...DATA_FLAGS,
  '-X',
  '--request',
  '-H',
  '--header',
  '-F',
  '--form',
  '-u',
  '--user',
  '--url',
  '-A',
  '--user-agent',
  '-e',
  '--referer'
])

function normalizeCurlInput(input: string): string {
  let s = input.trim().replace(/\\\r?\n/g, ' ')

  const longFlags = [
    '--data-raw',
    '--data-binary',
    '--data-urlencode',
    '--data-ascii',
    '--data',
    '--header',
    '--form',
    '--request',
    '--url'
  ]
  for (const flag of longFlags) {
    const escaped = flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    s = s.replace(new RegExp(`${escaped}=`, 'gi'), `${flag} `)
    s = s.replace(new RegExp(`${escaped}(['"])`, 'gi'), `${flag} $1`)
  }

  s = s.replace(/(-[dHXF])'/g, "$1 '")
  s = s.replace(/(-[dHXF])"/g, '$1 "')

  return s
}

function tokenizeCurl(input: string): string[] {
  const tokens: string[] = []
  let i = 0

  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i])) i++
    if (i >= input.length) break

    let token = ''

    if (input[i] === "'" || input[i] === '"') {
      const quote = input[i++]
      while (i < input.length) {
        if (quote === "'" && input[i] === "'") {
          if (i + 1 < input.length && input[i + 1] === "'") {
            token += "'"
            i += 2
            continue
          }
          i++
          break
        }
        if (quote === '"' && input[i] === '\\') {
          i++
          if (i < input.length) token += input[i++]
          continue
        }
        if (quote === '"' && input[i] === '"') {
          i++
          break
        }
        token += input[i++]
      }
    } else {
      while (i < input.length && !/\s/.test(input[i])) {
        token += input[i++]
      }
    }

    if (token) tokens.push(token)
  }

  return tokens
}

function readDataValue(value: string): string {
  if (!value.startsWith('@')) return value
  const filePath = value.slice(1).replace(/^["']|["']$/g, '')
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8')
    }
  } catch {
    /* file unavailable during import */
  }
  return value
}

function parseHeader(header: string): KeyValue | null {
  const idx = header.indexOf(':')
  if (idx <= 0) return null
  return {
    id: '',
    key: header.slice(0, idx).trim(),
    value: header.slice(idx + 1).trim(),
    enabled: true
  }
}

function parseFormField(field: string): KeyValue | null {
  const idx = field.indexOf('=')
  if (idx <= 0) return null
  return {
    id: '',
    key: field.slice(0, idx),
    value: field.slice(idx + 1),
    enabled: true
  }
}

function parseUrlEncodedPairs(body: string): KeyValue[] {
  const pairs: KeyValue[] = []
  for (const part of body.split('&')) {
    if (!part) continue
    const idx = part.indexOf('=')
    const key = idx === -1 ? part : part.slice(0, idx)
    const value = idx === -1 ? '' : part.slice(idx + 1)
    try {
      pairs.push({
        id: String(pairs.length),
        key: decodeURIComponent(key.replace(/\+/g, ' ')),
        value: decodeURIComponent(value.replace(/\+/g, ' ')),
        enabled: true
      })
    } catch {
      pairs.push({
        id: String(pairs.length),
        key,
        value,
        enabled: true
      })
    }
  }
  return pairs
}

function looksLikeJson(body: string): boolean {
  const trimmed = body.trim()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

function isUrlEncodedContentType(contentType: string | undefined): boolean {
  return !!contentType?.toLowerCase().includes('application/x-www-form-urlencoded')
}

function nextArg(tokens: string[], index: number): string | undefined {
  const next = tokens[index + 1]
  if (!next || next.startsWith('-')) return undefined
  return next
}

function isFlagToken(token: string): boolean {
  return token.startsWith('-') && !/^-?\d[\d.]*$/.test(token)
}

function extractArgument(tokens: string[], index: number): { value: string; consumed: number } | null {
  const firstIndex = index + 1
  if (firstIndex >= tokens.length) return null

  const first = tokens[firstIndex]
  if (isFlagToken(first)) return null

  if (first.startsWith('{') || first.startsWith('[')) {
    let depth = 0
    const parts: string[] = []
    let i = firstIndex
    while (i < tokens.length) {
      const t = tokens[i]
      if (parts.length > 0 && isFlagToken(t) && depth === 0) break
      parts.push(t)
      for (const ch of t) {
        if (ch === '{' || ch === '[') depth++
        if (ch === '}' || ch === ']') depth--
      }
      i++
      if (depth <= 0) break
    }
    return { value: parts.join(' '), consumed: i - index }
  }

  return { value: first, consumed: 1 }
}

function assignIds(items: KeyValue[]): KeyValue[] {
  return items.map((item, i) => ({ ...item, id: String(i) }))
}

export function parseCurl(curlString: string): Partial<RequestModel> {
  const normalized = normalizeCurlInput(curlString)
  let tokens = tokenizeCurl(normalized)
  if (tokens[0]?.toLowerCase() === 'curl') tokens = tokens.slice(1)

  let method: HttpMethod | undefined
  const headers: KeyValue[] = []
  const formData: KeyValue[] = []
  const urlEncodedParts: string[] = []
  let rawDataParts: string[] = []
  let url = ''

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const lower = token.toLowerCase()

    if (lower === '-x' || lower === '--request') {
      const value = nextArg(tokens, i)
      if (value) {
        method = value.toUpperCase() as HttpMethod
        i++
      }
      continue
    }

    if (lower === '-h' || lower === '--header') {
      const arg = extractArgument(tokens, i)
      if (arg) {
        const header = parseHeader(arg.value)
        if (header) headers.push(header)
        i += arg.consumed
      }
      continue
    }

    if (lower === '-f' || lower === '--form') {
      const arg = extractArgument(tokens, i)
      if (arg) {
        const field = parseFormField(arg.value)
        if (field) formData.push(field)
        i += arg.consumed
      }
      continue
    }

    if (DATA_FLAGS.has(lower)) {
      const arg = extractArgument(tokens, i)
      if (arg) {
        const body = readDataValue(arg.value)
        if (lower === '--data-urlencode') {
          urlEncodedParts.push(body)
        } else {
          rawDataParts.push(body)
        }
        i += arg.consumed
      }
      continue
    }

    if (lower === '-u' || lower === '--user') {
      i++
      continue
    }

    if (lower === '--url') {
      const value = nextArg(tokens, i)
      if (value) {
        url = value
        i++
      }
      continue
    }

    if (token.startsWith('-')) {
      if (VALUE_FLAGS.has(lower)) i++
      continue
    }

    if (!url && /^https?:\/\//i.test(token)) {
      url = token
    }
  }

  const basicToken = tokens.find((t, i) => {
    const lower = t.toLowerCase()
    return (lower === '-u' || lower === '--user') && nextArg(tokens, i)
  })
  let authType: AuthType = 'none'
  const auth: RequestModel['auth'] = {}
  if (basicToken) {
    const idx = tokens.indexOf(basicToken)
    const creds = nextArg(tokens, idx)
    if (creds) {
      const colon = creds.indexOf(':')
      authType = 'basic'
      auth.basicUsername = colon === -1 ? creds : creds.slice(0, colon)
      auth.basicPassword = colon === -1 ? '' : creds.slice(colon + 1)
    }
  }

  const bearerHeader = headers.find((h) => h.key.toLowerCase() === 'authorization')
  if (bearerHeader?.value.startsWith('Bearer ')) {
    authType = 'bearer'
    auth.bearerToken = bearerHeader.value.slice(7)
  }

  let bodyType: RequestModel['bodyType'] = 'none'
  let bodyRaw = ''
  let bodyRawContentType = 'application/json'
  let urlEncoded: KeyValue[] = []

  const contentTypeHeader = headers.find((h) => h.key.toLowerCase() === 'content-type')
  if (contentTypeHeader) bodyRawContentType = contentTypeHeader.value

  if (formData.length > 0) {
    bodyType = 'form-data'
  } else if (urlEncodedParts.length > 0) {
    bodyType = 'x-www-form-urlencoded'
    urlEncoded = assignIds(
      urlEncodedParts.flatMap((part) => {
        const pair = parseUrlEncodedPairs(part)
        return pair.length > 0 ? pair : parseUrlEncodedPairs(`${part}=`).slice(0, 1)
      })
    )
    if (urlEncoded.length === 0 && urlEncodedParts.length === 1) {
      const idx = urlEncodedParts[0].indexOf('=')
      urlEncoded = assignIds([
        {
          id: '0',
          key: idx === -1 ? urlEncodedParts[0] : urlEncodedParts[0].slice(0, idx),
          value: idx === -1 ? '' : urlEncodedParts[0].slice(idx + 1),
          enabled: true
        }
      ])
    }
  } else if (rawDataParts.length > 0) {
    bodyRaw = rawDataParts.join('&')
    const urlEncodedFromData =
      (isUrlEncodedContentType(contentTypeHeader?.value) && !looksLikeJson(bodyRaw)) ||
      (!contentTypeHeader &&
        !looksLikeJson(bodyRaw) &&
        /^[^=&]+=[^=&]*(?:&[^=&]+=[^=&]*)*$/.test(bodyRaw.trim()))

    if (urlEncodedFromData) {
      bodyType = 'x-www-form-urlencoded'
      urlEncoded = assignIds(parseUrlEncodedPairs(bodyRaw))
      bodyRaw = ''
    } else {
      bodyType = 'raw'
      if (!contentTypeHeader && looksLikeJson(bodyRaw)) {
        bodyRawContentType = 'application/json'
      }
    }
  }

  const hasBody = bodyType !== 'none'
  if (!method && hasBody) method = 'POST'

  return {
    name: 'Imported cURL Request',
    method: method || 'GET',
    url,
    headers: assignIds(headers),
    bodyType,
    bodyRaw,
    bodyRawContentType,
    formData: assignIds(formData),
    urlEncoded,
    authType,
    auth,
    protocol: 'http'
  }
}

export function exportToCurl(request: RequestModel): string {
  const lines: string[] = []
  const method = request.method

  if (method !== 'GET') {
    lines.push(`curl -X ${method} --location \\`)
  } else {
    lines.push('curl --location \\')
  }
  lines.push(`  '${request.url}'`)

  for (const h of request.headers) {
    if (h.enabled && h.key) {
      lines.push(`  --header '${h.key}: ${h.value}'`)
    }
  }

  if (request.authType === 'bearer' && request.auth.bearerToken) {
    lines.push(`  --header 'Authorization: Bearer ${request.auth.bearerToken}'`)
  } else if (request.authType === 'basic' && request.auth.basicUsername) {
    lines.push(`  -u '${request.auth.basicUsername}:${request.auth.basicPassword || ''}'`)
  }

  if (request.bodyType === 'raw' && request.bodyRaw) {
    lines.push(`  --data '${request.bodyRaw.replace(/'/g, "'\\''")}'`)
  } else if (request.bodyType === 'form-data') {
    for (const f of request.formData) {
      if (f.enabled && f.key) {
        lines.push(`  -F '${f.key}=${f.value}'`)
      }
    }
  } else if (request.bodyType === 'x-www-form-urlencoded') {
    const params = request.urlEncoded
      .filter((u) => u.enabled && u.key)
      .map((u) => `${u.key}=${encodeURIComponent(u.value)}`)
      .join('&')
    if (params) lines.push(`  --data '${params}'`)
  }

  return lines.join(' \\\n')
}
