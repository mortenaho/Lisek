import { getAll, getOne, runQuery } from '../db'
import { readFileSync, writeFileSync } from 'fs'
import { basename } from 'path'
import { v4 as uuidv4 } from 'uuid'
import YAML from 'yaml'
import SwaggerParser from '@apidevtools/swagger-parser'
import type { KeyValue, OpenApiSpecModel, RequestModel } from '../../../shared/types'
import { saveRequest, saveEnvironment, setActiveEnvironment } from './repository'
import { fetchImportSource, type ImportFormatHint } from './fetch-import.service'

type JsonSchema = {
  type?: string | string[]
  example?: unknown
  default?: unknown
  enum?: unknown[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  allOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  format?: string
  additionalProperties?: boolean | JsonSchema
  nullable?: boolean
}

type MediaContent = {
  example?: unknown
  examples?: Record<string, { value?: unknown }>
  schema?: JsonSchema
}

type OpenApiOperation = {
  operationId?: string
  summary?: string
  tags?: string[]
  parameters?: Array<{
    name: string
    in: string
    schema?: JsonSchema
    example?: unknown
  }>
  requestBody?: { content?: Record<string, MediaContent> }
}

function parseImportContent(content: string, formatHint: ImportFormatHint = 'unknown'): unknown {
  if (formatHint === 'yaml') return YAML.parse(content)
  if (formatHint === 'json') return JSON.parse(content)
  const trimmed = content.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(content)
  return YAML.parse(content)
}

/** Build a sample JSON value from an OpenAPI/JSON Schema (no example required). */
export function sampleFromSchema(schema: JsonSchema | undefined, depth = 0): unknown {
  if (!schema || depth > 8) return null
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  if (schema.enum?.length) return schema.enum[0]

  if (schema.allOf?.length) {
    const merged: Record<string, unknown> = {}
    let hasObject = false
    let fallback: unknown
    for (const part of schema.allOf) {
      const sample = sampleFromSchema(part, depth + 1)
      if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
        Object.assign(merged, sample)
        hasObject = true
      } else if (fallback === undefined) {
        fallback = sample
      }
    }
    return hasObject ? merged : fallback ?? null
  }

  const alt = schema.oneOf?.[0] || schema.anyOf?.[0]
  if (alt) return sampleFromSchema(alt, depth + 1)

  const rawType = Array.isArray(schema.type)
    ? schema.type.find((t) => t !== 'null')
    : schema.type

  if (schema.properties) {
    const obj: Record<string, unknown> = {}
    for (const [key, prop] of Object.entries(schema.properties)) {
      obj[key] = sampleFromSchema(prop, depth + 1)
    }
    return obj
  }

  switch (rawType) {
    case 'string':
      if (schema.format === 'date-time') return '2024-01-01T00:00:00.000Z'
      if (schema.format === 'date') return '2024-01-01'
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000'
      if (schema.format === 'email') return 'user@example.com'
      if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com'
      return 'string'
    case 'number':
      return 0
    case 'integer':
      return 0
    case 'boolean':
      return true
    case 'array':
      return [sampleFromSchema(schema.items, depth + 1)]
    case 'object':
      return {}
    default:
      if (schema.items) return [sampleFromSchema(schema.items, depth + 1)]
      return null
  }
}

function firstNamedExample(examples?: Record<string, { value?: unknown }>): unknown {
  if (!examples) return undefined
  for (const ex of Object.values(examples)) {
    if (ex?.value !== undefined) return ex.value
  }
  return undefined
}

function findJsonMedia(content: Record<string, MediaContent>): MediaContent | undefined {
  if (content['application/json']) return content['application/json']
  const key = Object.keys(content).find(
    (k) =>
      k === 'application/json' ||
      k.startsWith('application/json;') ||
      /(^|\/|\+)json($|;)/i.test(k)
  )
  return key ? content[key] : Object.values(content)[0]
}

function stringifyBodySample(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  return JSON.stringify(value, null, 2)
}

function paramSampleValue(p: { example?: unknown; schema?: JsonSchema }): string {
  const value = p.example ?? p.schema?.example ?? sampleFromSchema(p.schema)
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Resolve request body for OpenAPI 3 requestBody and Swagger 2 in:body parameters. */
export function extractOperationBody(op: OpenApiOperation | undefined): {
  bodyType: RequestModel['bodyType']
  bodyRaw: string
  bodyRawContentType: string
} {
  const empty = { bodyType: 'none' as const, bodyRaw: '', bodyRawContentType: 'application/json' }
  if (!op) return empty

  if (op.requestBody?.content) {
    const media = findJsonMedia(op.requestBody.content)
    if (!media) return { bodyType: 'raw', bodyRaw: '', bodyRawContentType: 'application/json' }

    const sample =
      media.example ??
      firstNamedExample(media.examples) ??
      media.schema?.example ??
      sampleFromSchema(media.schema)

    return {
      bodyType: 'raw',
      bodyRaw: stringifyBodySample(sample),
      bodyRawContentType: 'application/json'
    }
  }

  const bodyParam = op.parameters?.find((p) => p.in === 'body')
  if (bodyParam?.schema) {
    const sample = bodyParam.example ?? bodyParam.schema.example ?? sampleFromSchema(bodyParam.schema)
    return {
      bodyType: 'raw',
      bodyRaw: stringifyBodySample(sample),
      bodyRawContentType: 'application/json'
    }
  }

  return empty
}

function parseFileContent(filePath: string): unknown {
  const content = readFileSync(filePath, 'utf-8')
  const formatHint: ImportFormatHint =
    filePath.endsWith('.yaml') || filePath.endsWith('.yml') ? 'yaml' : 'json'
  return parseImportContent(content, formatHint)
}

export function importOpenApi(filePath: string) {
  const content = readFileSync(filePath, 'utf-8')
  const formatHint: ImportFormatHint =
    filePath.endsWith('.yaml') || filePath.endsWith('.yml') ? 'yaml' : 'json'
  return importOpenApiFromContent(content, basename(filePath), filePath, formatHint)
}

export async function importOpenApiFromUrl(url: string) {
  const fetched = await fetchImportSource(url)
  return importOpenApiFromContent(fetched.content, fetched.sourceLabel, url, fetched.formatHint)
}

export async function importOpenApiFromContent(
  content: string,
  sourceName: string,
  sourcePath: string,
  formatHint: ImportFormatHint = 'unknown'
): Promise<{
  collectionId: string
  specId: string
  count: number
}> {
  const raw = parseImportContent(content, formatHint)
  const api = await SwaggerParser.validate(raw as Parameters<typeof SwaggerParser.validate>[0])
  const specId = uuidv4()
  const collectionId = uuidv4()
  const now = Date.now()

  const isSwagger2 = !!(api as { swagger?: string }).swagger
  const title = (api as { info?: { title?: string; version?: string } }).info?.title || sourceName
  const version = (api as { info?: { title?: string; version?: string } }).info?.version || '1.0'

  let servers: string[] = []
  if ((api as { servers?: { url: string }[] }).servers) {
    servers = (api as { servers: { url: string }[] }).servers.map((s) => s.url)
  } else if ((api as { host?: string }).host) {
    const a = api as { host: string; basePath?: string; schemes?: string[] }
    const scheme = a.schemes?.[0] || 'https'
    servers = [`${scheme}://${a.host}${a.basePath || ''}`]
  }

  runQuery(
    'INSERT INTO openapi_specs (id, name, file_path, format, content, title, version, servers_json, imported_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [specId, sourceName, sourcePath, isSwagger2 ? 'swagger2' : 'openapi3', content, title, version, JSON.stringify(servers), now]
  )

  runQuery(
    'INSERT INTO collections (id, name, parent_id, sort_order, variables_json, created_at) VALUES (?,?,?,?,?,?)',
    [collectionId, title, null, 0, JSON.stringify([{ id: '1', key: 'baseUrl', value: servers[0] || '', enabled: true }]), now]
  )

  const paths = (api as { paths?: Record<string, Record<string, unknown>> }).paths || {}
  const tagFolders = new Map<string, string>()
  let count = 0

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        const op = operation as OpenApiOperation

        const tag = op.tags?.[0] || 'Default'
        if (!tagFolders.has(tag)) {
          const folderId = uuidv4()
          tagFolders.set(tag, folderId)
          runQuery(
            'INSERT INTO collections (id, name, parent_id, sort_order, variables_json, created_at) VALUES (?,?,?,?,?,?)',
            [folderId, tag, collectionId, tagFolders.size, '[]', now]
          )
        }

        const headers: KeyValue[] = []
        const params: KeyValue[] = []

        for (const p of op.parameters || []) {
          if (p.in === 'body') continue
          const kv: KeyValue = {
            id: uuidv4(),
            key: p.name,
            value: paramSampleValue(p),
            enabled: true
          }
          if (p.in === 'header') headers.push(kv)
          else if (p.in === 'query') params.push(kv)
        }

        const { bodyType, bodyRaw, bodyRawContentType } = extractOperationBody(op)

        saveRequest({
          collectionId: tagFolders.get(tag)!,
          name: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
          method: method.toUpperCase() as RequestModel['method'],
          url: `{{baseUrl}}${path}`,
          headers,
          params,
          bodyType,
          bodyRaw,
          bodyRawContentType,
          protocol: 'http'
        })
        count++
      }
    }
  }

  return { collectionId, specId, count }
}

export function listOpenApiSpecs(): OpenApiSpecModel[] {
  const rows = getAll<{
    id: string
    name: string
    file_path: string
    format: string
    content: string
    title: string
    version: string
    servers_json: string
    imported_at: number
  }>('SELECT * FROM openapi_specs')
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    filePath: r.file_path,
    format: r.format as 'openapi3' | 'swagger2',
    content: r.content,
    title: r.title,
    version: r.version,
    servers: JSON.parse(r.servers_json),
    importedAt: r.imported_at
  }))
}

export function deleteOpenApiSpec(id: string) {
  runQuery('DELETE FROM openapi_specs WHERE id = ?', [id])
}

export function getOpenApiPaths(specId: string): import('../../../shared/types').OpenApiPathItem[] {
  const spec = listOpenApiSpecs().find((s) => s.id === specId)
  if (!spec) return []

  const raw = spec.content.startsWith('{') ? JSON.parse(spec.content) : YAML.parse(spec.content)
  const paths = (raw as { paths?: Record<string, Record<string, unknown>> }).paths || {}
  const items: import('../../../shared/types').OpenApiPathItem[] = []

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue
      const op = operation as { summary?: string; operationId?: string }
      items.push({
        path,
        method: method.toUpperCase(),
        summary: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
        operationId: op.operationId
      })
    }
  }

  return items.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
}

export async function generateRequestFromSpec(
  specId: string,
  path: string,
  method: string,
  collectionId: string | null = null
): Promise<RequestModel> {
  const spec = listOpenApiSpecs().find((s) => s.id === specId)
  if (!spec) throw new Error('OpenAPI spec not found')

  const raw = spec.content.startsWith('{') ? JSON.parse(spec.content) : YAML.parse(spec.content)
  const api = await SwaggerParser.dereference(raw as Parameters<typeof SwaggerParser.dereference>[0])
  const pathItem = (api as { paths?: Record<string, Record<string, unknown>> }).paths?.[path]
  const op = pathItem?.[method.toLowerCase()] as OpenApiOperation | undefined

  const headers: KeyValue[] = []
  const params: KeyValue[] = []

  for (const p of op?.parameters || []) {
    if (p.in === 'body') continue
    const kv: KeyValue = {
      id: uuidv4(),
      key: p.name,
      value: paramSampleValue(p),
      enabled: true
    }
    if (p.in === 'header') headers.push(kv)
    else if (p.in === 'query') params.push(kv)
  }

  const { bodyType, bodyRaw, bodyRawContentType } = extractOperationBody(op)

  const baseUrl = spec.servers[0] || '{{baseUrl}}'
  const base = baseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return saveRequest({
    collectionId,
    name: op?.summary || op?.operationId || `${method.toUpperCase()} ${path}`,
    method: method.toUpperCase() as RequestModel['method'],
    url: `${base}${normalizedPath}`,
    headers,
    params,
    bodyType,
    bodyRaw,
    bodyRawContentType,
    protocol: 'http'
  })
}

export function exportToOpenApi(collectionId: string, filePath: string) {
  const col = getOne<{ name: string }>('SELECT name FROM collections WHERE id = ?', [collectionId])
  const reqs = getAll<{ url: string; method: string; name: string }>(
    'SELECT url, method, name FROM requests WHERE collection_id = ?',
    [collectionId]
  )

  const spec = {
    openapi: '3.0.0',
    info: { title: col?.name || 'Lisek Export', version: '1.0.0' },
    servers: [{ url: '{{baseUrl}}' }],
    paths: {} as Record<string, Record<string, unknown>>
  }

  for (const req of reqs) {
    const path = req.url.replace('{{baseUrl}}', '') || '/'
    if (!spec.paths[path]) spec.paths[path] = {}
    spec.paths[path][req.method.toLowerCase()] = {
      summary: req.name,
      responses: { '200': { description: 'OK' } }
    }
  }

  writeFileSync(filePath, JSON.stringify(spec, null, 2))
}

export function createEnvironmentFromSpec(specId: string, activate = false) {
  const spec = listOpenApiSpecs().find((s) => s.id === specId)
  if (!spec) throw new Error('OpenAPI spec not found')

  const variables: KeyValue[] = spec.servers.map((url, index) => ({
    id: uuidv4(),
    key: index === 0 ? 'baseUrl' : `baseUrl_${index + 1}`,
    value: url,
    enabled: true
  }))

  const raw = spec.content.startsWith('{') ? JSON.parse(spec.content) : YAML.parse(spec.content)
  const version = (raw as { info?: { version?: string } }).info?.version
  if (version) {
    variables.push({ id: uuidv4(), key: 'apiVersion', value: version, enabled: true })
  }

  const securitySchemes = (raw as { components?: { securitySchemes?: Record<string, { type?: string; scheme?: string; name?: string }> } })
    .components?.securitySchemes
  if (securitySchemes) {
    for (const [name, scheme] of Object.entries(securitySchemes)) {
      if (scheme.type === 'http' && scheme.scheme === 'bearer') {
        variables.push({ id: uuidv4(), key: `${name}Token`, value: '', enabled: true, secret: true })
      } else if (scheme.type === 'apiKey' && scheme.name) {
        variables.push({ id: uuidv4(), key: scheme.name, value: '', enabled: true, secret: true })
      }
    }
  }

  const env = saveEnvironment({
    name: `${spec.title} Environment`,
    isActive: activate,
    variables
  })
  if (activate) setActiveEnvironment(env.id)
  return env
}
