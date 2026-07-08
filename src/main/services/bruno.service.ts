import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { KeyValue, RequestModel } from '../../../shared/types'
import { createCollection, listCollections, listRequests, saveRequest } from './repository'

function slugify(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'request'
}

function parseBruBlocks(content: string): Map<string, string> {
  const blocks = new Map<string, string>()
  const lines = content.split(/\r?\n/)
  let currentKey: string | null = null
  let depth = 0
  let body: string[] = []

  const flush = () => {
    if (currentKey) blocks.set(currentKey, body.join('\n').trim())
    body = []
  }

  for (const line of lines) {
    const blockStart = line.match(/^([a-z0-9:_-]+)\s*\{\s*$/)
    if (blockStart && depth === 0) {
      flush()
      currentKey = blockStart[1]
      depth = 1
      continue
    }
    if (currentKey) {
      if (line.includes('{')) depth += (line.match(/\{/g) || []).length
      if (line.includes('}')) depth -= (line.match(/\}/g) || []).length
      if (depth <= 0) {
        flush()
        currentKey = null
        depth = 0
        continue
      }
      body.push(line)
    }
  }
  flush()
  return blocks
}

function parseKeyValueBlock(block: string): KeyValue[] {
  const rows: KeyValue[] = []
  for (const line of block.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (key) rows.push({ id: uuidv4(), key, value, enabled: true })
  }
  return rows
}

function parseBruRequest(content: string, fallbackName: string): Omit<RequestModel, 'id' | 'createdAt' | 'updatedAt'> {
  const blocks = parseBruBlocks(content)
  const meta = parseKeyValueBlock(blocks.get('meta') || '')
  const name = meta.find((m) => m.key === 'name')?.value || fallbackName

  const methodBlockKey = [...blocks.keys()].find((k) =>
    ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(k)
  )
  const method = (methodBlockKey || 'get').toUpperCase() as RequestModel['method']
  const methodBlock = parseKeyValueBlock(blocks.get(methodBlockKey || 'get') || '')
  const url = methodBlock.find((m) => m.key === 'url')?.value || ''
  const headers = parseKeyValueBlock(blocks.get('headers') || '')

  let bodyType: RequestModel['bodyType'] = 'none'
  let bodyRaw = ''
  let bodyRawContentType = 'application/json'
  const jsonBody = blocks.get('body:json')
  const textBody = blocks.get('body:text')
  if (jsonBody) {
    bodyType = 'raw'
    bodyRaw = jsonBody
    bodyRawContentType = 'application/json'
  } else if (textBody) {
    bodyType = 'raw'
    bodyRaw = textBody
    bodyRawContentType = 'text/plain'
  }

  return {
    collectionId: null,
    name,
    method,
    url,
    headers,
    params: [],
    bodyType,
    bodyRaw,
    bodyRawContentType,
    formData: [],
    urlEncoded: [],
    authType: 'none',
    auth: {},
    preRequestScript: blocks.get('script:pre-request') || '',
    testScript: blocks.get('tests') || blocks.get('script:post-response') || '',
    protocol: 'http',
    graphqlQuery: '',
    graphqlVariables: '{}',
    graphqlOperationType: 'query',
    wsUrl: '',
    wsMessages: [],
    sseUrl: '',
    sseMessages: [],
    grpcTarget: '',
    grpcService: '',
    grpcMethod: '',
    grpcCallType: 'unary',
    grpcProtoId: null,
    grpcMetadata: [],
    grpcMessage: '{}',
    sortOrder: 0,
    pinned: false,
    tags: [],
    notes: ''
  }
}

function walkBruFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walkBruFiles(full))
    else if (entry.endsWith('.bru')) files.push(full)
  }
  return files
}

export function importBrunoCollection(folderPath: string, parentCollectionId: string | null = null) {
  const manifestPath = join(folderPath, 'bruno.json')
  let collectionName = basename(folderPath)
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { name?: string }
    collectionName = manifest.name || collectionName
  }

  const root = createCollection({ name: collectionName, parentId: parentCollectionId })
  let count = 0
  for (const file of walkBruFiles(folderPath)) {
    const content = readFileSync(file, 'utf-8')
    const parsed = parseBruRequest(content, basename(file, '.bru'))
    saveRequest({ ...parsed, collectionId: root.id })
    count++
  }
  return { collectionId: root.id, count }
}

function requestToBru(req: RequestModel): string {
  const lines: string[] = [
    'meta {',
    `  name: ${req.name}`,
    '  type: http',
    '}',
    '',
    `${req.method.toLowerCase()} {`,
    `  url: ${req.url}`,
    '  body: none',
    '  auth: none',
    '}'
  ]

  const headers = req.headers.filter((h) => h.enabled && h.key)
  if (headers.length) {
    lines.push('', 'headers {')
    for (const h of headers) lines.push(`  ${h.key}: ${h.value}`)
    lines.push('}')
  }

  if (req.bodyType === 'raw' && req.bodyRaw) {
    const block = req.bodyRawContentType.includes('json') ? 'body:json' : 'body:text'
    lines.push('', `${block} {`, req.bodyRaw, '}')
  }

  if (req.preRequestScript) {
    lines.push('', 'script:pre-request {', req.preRequestScript, '}')
  }
  if (req.testScript) {
    lines.push('', 'tests {', req.testScript, '}')
  }

  return `${lines.join('\n')}\n`
}

export function exportBrunoCollection(collectionId: string, folderPath: string): number {
  const collections = listCollections()
  const root = collections.find((c) => c.id === collectionId)
  if (!root) throw new Error('Collection not found')

  mkdirSync(folderPath, { recursive: true })
  writeFileSync(
    join(folderPath, 'bruno.json'),
    JSON.stringify({ version: '1', name: root.name, type: 'collection' }, null, 2),
    'utf-8'
  )

  const childIds = new Set(
    collections.filter((c) => c.parentId === collectionId || c.id === collectionId).map((c) => c.id)
  )
  const requests = listRequests().filter((r) => r.collectionId && childIds.has(r.collectionId))
  let count = 0
  for (const req of requests) {
    const fileName = `${slugify(req.name)}.bru`
    writeFileSync(join(folderPath, fileName), requestToBru(req), 'utf-8')
    count++
  }
  return count
}
