import { readFileSync, writeFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { getAll, getOne, runQuery } from '../db'
import type { AuthConfig, AuthType, KeyValue, RequestModel } from '../../../shared/types'
import { rowToRequest, saveRequest } from './repository'

interface PostmanItem {
  name: string
  item?: PostmanItem[]
  request?: {
    method?: string
    header?: { key: string; value: string; disabled?: boolean }[]
    url?: string | { raw?: string; query?: { key: string; value: string; disabled?: boolean }[] }
    body?: {
      mode?: string
      raw?: string
      urlencoded?: { key: string; value: string; disabled?: boolean }[]
      formdata?: { key: string; value: string; disabled?: boolean }[]
    }
    auth?: {
      type?: string
      bearer?: { token?: string }[]
      basic?: { username?: string; password?: string }[]
      apikey?: { key?: string; value?: string; in?: string }[]
    }
  }
  event?: { listen: string; script: { exec: string[] } }[]
}

export function importPostman(filePath: string): { collectionId: string; count: number } {
  const content = JSON.parse(readFileSync(filePath, 'utf-8'))
  const rootId = uuidv4()
  const now = Date.now()
  let count = 0

  runQuery(
    'INSERT INTO collections (id, name, parent_id, sort_order, variables_json, created_at) VALUES (?,?,?,?,?,?)',
    [
      rootId,
      content.info?.name || 'Imported Collection',
      null,
      0,
      JSON.stringify(
        (content.variable || []).map((v: { key: string; value: string }, i: number) => ({
          id: String(i),
          key: v.key,
          value: v.value,
          enabled: true
        }))
      ),
      now
    ]
  )

  function processItems(items: PostmanItem[], parentId: string) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.item) {
        const folderId = uuidv4()
        runQuery(
          'INSERT INTO collections (id, name, parent_id, sort_order, variables_json, created_at) VALUES (?,?,?,?,?,?)',
          [folderId, item.name, parentId, i, '[]', now]
        )
        processItems(item.item, folderId)
      } else if (item.request) {
        saveRequest(mapPostmanRequest(item, parentId, i, now))
        count++
      }
    }
  }

  processItems(content.item || [], rootId)
  return { collectionId: rootId, count }
}

function mapPostmanRequest(item: PostmanItem, collectionId: string, sortOrder: number, now: number): RequestModel {
  const r = item.request!
  let url = ''
  const params: KeyValue[] = []

  if (typeof r.url === 'string') url = r.url
  else if (r.url) {
    url = r.url.raw || ''
    for (const q of r.url.query || []) {
      params.push({ id: uuidv4(), key: q.key, value: q.value, enabled: !q.disabled })
    }
  }

  const headers: KeyValue[] = (r.header || []).map((h, i) => ({
    id: String(i),
    key: h.key,
    value: h.value,
    enabled: !h.disabled
  }))

  let bodyType: RequestModel['bodyType'] = 'none'
  let bodyRaw = ''
  const formData: KeyValue[] = []
  const urlEncoded: KeyValue[] = []

  if (r.body) {
    if (r.body.mode === 'raw') {
      bodyType = 'raw'
      bodyRaw = r.body.raw || ''
    } else if (r.body.mode === 'urlencoded') {
      bodyType = 'x-www-form-urlencoded'
      for (const u of r.body.urlencoded || []) {
        urlEncoded.push({ id: uuidv4(), key: u.key, value: u.value, enabled: !u.disabled })
      }
    } else if (r.body.mode === 'formdata') {
      bodyType = 'form-data'
      for (const f of r.body.formdata || []) {
        formData.push({ id: uuidv4(), key: f.key, value: f.value, enabled: !f.disabled })
      }
    }
  }

  let authType: AuthType = 'none'
  const auth: AuthConfig = {}
  if (r.auth?.type === 'bearer') {
    authType = 'bearer'
    auth.bearerToken = r.auth.bearer?.[0]?.token || ''
  } else if (r.auth?.type === 'basic') {
    authType = 'basic'
    auth.basicUsername = r.auth.basic?.[0]?.username || ''
    auth.basicPassword = r.auth.basic?.[0]?.password || ''
  } else if (r.auth?.type === 'apikey') {
    authType = 'apikey'
    auth.apiKeyKey = r.auth.apikey?.[0]?.key || ''
    auth.apiKeyValue = r.auth.apikey?.[0]?.value || ''
    auth.apiKeyIn = (r.auth.apikey?.[0]?.in as 'header' | 'query') || 'header'
  }

  let preRequestScript = ''
  let testScript = ''
  for (const e of item.event || []) {
    if (e.listen === 'prerequest') preRequestScript = e.script.exec.join('\n')
    if (e.listen === 'test') testScript = e.script.exec.join('\n')
  }

  return {
    id: uuidv4(),
    collectionId,
    name: item.name,
    method: (r.method?.toUpperCase() || 'GET') as RequestModel['method'],
    url,
    headers,
    params,
    bodyType,
    bodyRaw,
    bodyRawContentType: 'application/json',
    formData,
    urlEncoded,
    authType,
    auth,
    preRequestScript,
    testScript,
    protocol: 'http',
    graphqlQuery: '',
    graphqlVariables: '{}',
    wsUrl: '',
    wsMessages: [],
    grpcTarget: '',
    grpcService: '',
    grpcMethod: '',
    grpcCallType: 'unary',
    grpcProtoId: null,
    grpcMetadata: [],
    grpcMessage: '{}',
    sortOrder,
    pinned: false,
    createdAt: now,
    updatedAt: now
  }
}

export function exportPostman(collectionId: string, filePath: string) {
  const col = getOne<{ name: string; variables_json: string }>('SELECT name, variables_json FROM collections WHERE id = ?', [
    collectionId
  ])
  const allCols = getAll<{ id: string; name: string; parent_id: string | null }>('SELECT id, name, parent_id FROM collections')
  const allReqs = getAll<Parameters<typeof rowToRequest>[0]>('SELECT * FROM requests')

  const childCollections = allCols.filter((c) => c.parent_id === collectionId)
  const childRequests = allReqs.filter((r) => r.collection_id === collectionId)

  const item = [
    ...childCollections.map((c) => buildFolder(c, allCols, allReqs)),
    ...childRequests.map((r) => buildPostmanItem(rowToRequest(r)))
  ]

  const output = {
    info: {
      name: col?.name || 'Export',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item,
    variable: JSON.parse(col?.variables_json || '[]').map((v: KeyValue) => ({
      key: v.key,
      value: v.value
    }))
  }

  writeFileSync(filePath, JSON.stringify(output, null, 2))
}

function buildFolder(
  col: { id: string; name: string; parent_id: string | null },
  allCols: { id: string; name: string; parent_id: string | null }[],
  allReqs: Parameters<typeof rowToRequest>[0][]
): PostmanItem {
  const children = allCols.filter((c) => c.parent_id === col.id)
  const reqs = allReqs.filter((r) => r.collection_id === col.id)
  return {
    name: col.name,
    item: [
      ...children.map((c) => buildFolder(c, allCols, allReqs)),
      ...reqs.map((r) => buildPostmanItem(rowToRequest(r)))
    ]
  }
}

function buildPostmanItem(req: RequestModel): PostmanItem {
  const events = []
  if (req.preRequestScript) events.push({ listen: 'prerequest', script: { exec: req.preRequestScript.split('\n') } })
  if (req.testScript) events.push({ listen: 'test', script: { exec: req.testScript.split('\n') } })

  return {
    name: req.name,
    event: events.length > 0 ? events : undefined,
    request: {
      method: req.method,
      header: req.headers.map((h) => ({ key: h.key, value: h.value, disabled: !h.enabled })),
      url: { raw: req.url, query: req.params.map((p) => ({ key: p.key, value: p.value, disabled: !p.enabled })) },
      body:
        req.bodyType === 'none'
          ? undefined
          : {
              mode: req.bodyType === 'raw' ? 'raw' : req.bodyType === 'form-data' ? 'formdata' : 'urlencoded',
              raw: req.bodyRaw,
              formdata: req.formData.map((f) => ({ key: f.key, value: f.value, disabled: !f.enabled })),
              urlencoded: req.urlEncoded.map((u) => ({ key: u.key, value: u.value, disabled: !u.enabled }))
            }
    }
  }
}
