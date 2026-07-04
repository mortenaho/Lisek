import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { initDatabase, getSettings, setSettings } from '../src/main/db/index'
import {
  createCollection,
  listCollections,
  updateCollection,
  listEnvironments,
  saveRequest,
  getRequest,
  deleteRequest,
  listRequests,
  moveRequest,
  saveEnvironment,
  setActiveEnvironment,
  getActiveEnvironment,
  addHistory,
  listHistory,
  clearHistory,
  seedFreshInstall
} from '../src/main/services/repository'

describe('Database & repository integration', () => {
  let tempDir: string
  let dbPath: string

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'fluxapi-test-'))
    dbPath = join(tempDir, 'fluxapi.db')
    await initDatabase(dbPath)
  })

  afterAll(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  })

  it('initDatabase — creates database file', () => {
    expect(existsSync(dbPath)).toBe(true)
  })

  it('initDatabase — reports new database on first run', async () => {
    const freshPath = join(tempDir, 'fresh.db')
    const { isNew } = await initDatabase(freshPath)
    expect(isNew).toBe(true)
    expect(listCollections()).toHaveLength(0)
  })

  it('seedFreshInstall — creates default environment and collection', async () => {
    const seedPath = join(tempDir, 'seed.db')
    await initDatabase(seedPath)
    seedFreshInstall()

    const envs = listEnvironments()
    expect(envs).toHaveLength(1)
    expect(envs[0].name).toBe('Local')
    expect(getActiveEnvironment()?.id).toBe(envs[0].id)

    const cols = listCollections()
    expect(cols).toHaveLength(1)
    expect(cols[0].name).toBe('My Collection')
  })

  it('getSettings — returns defaults', () => {
    const settings = getSettings()
    expect(settings.sslVerify).toBe(true)
    expect(settings.timeoutMs).toBe(30000)
    expect(settings.theme).toBe('light')
  })

  it('setSettings — persists theme change', () => {
    setSettings({ theme: 'dark' })
    expect(getSettings().theme).toBe('dark')
    setSettings({ theme: 'light' })
  })

  it('collections — pinned items sort above unpinned items', () => {
    const older = createCollection({ name: 'Older Collection' })
    const newer = createCollection({ name: 'Newer Collection' })
    updateCollection(older.id, { pinned: true })

    const root = listCollections().filter((c) => !c.parentId)
    expect(root[0].id).toBe(older.id)
    expect(root.some((c) => c.id === newer.id)).toBe(true)
  })

  it('collections — new items appear at the top of their group', () => {
    const first = createCollection({ name: 'First Collection Sort Test' })
    const second = createCollection({ name: 'Second Collection Sort Test' })
    const root = listCollections()
      .filter((c) => !c.parentId && !c.pinned)
      .filter((c) => c.id === first.id || c.id === second.id)
    expect(root[0].id).toBe(second.id)
    expect(root[1].id).toBe(first.id)
  })

  it('requests — new items appear at the top of their collection', () => {
    const col = createCollection({ name: 'Sort Collection' })
    const first = saveRequest({ collectionId: col.id, name: 'First Request', method: 'GET', url: 'https://a.test' })
    const second = saveRequest({ collectionId: col.id, name: 'Second Request', method: 'GET', url: 'https://b.test' })
    const ordered = listRequests(col.id)
    expect(ordered[0].id).toBe(second.id)
    expect(ordered[1].id).toBe(first.id)
  })

  it('requests — moveRequest reorders within a collection', () => {
    const col = createCollection({ name: 'Move Collection' })
    saveRequest({ collectionId: col.id, name: 'A', method: 'GET', url: 'https://a.test' })
    const b = saveRequest({ collectionId: col.id, name: 'B', method: 'GET', url: 'https://b.test' })
    saveRequest({ collectionId: col.id, name: 'C', method: 'GET', url: 'https://c.test' })

    expect(listRequests(col.id).map((r) => r.name)).toEqual(['C', 'B', 'A'])

    moveRequest(b.id, col.id, null)

    expect(listRequests(col.id).map((r) => r.name)).toEqual(['C', 'A', 'B'])
  })

  it('requests — moveRequest moves to another collection', () => {
    const colA = createCollection({ name: 'Col A' })
    const colB = createCollection({ name: 'Col B' })
    const req = saveRequest({ collectionId: colA.id, name: 'Moved', method: 'GET', url: 'https://x.test' })

    moveRequest(req.id, colB.id, null)

    expect(listRequests(colA.id)).toHaveLength(0)
    expect(listRequests(colB.id).some((r) => r.id === req.id)).toBe(true)
    expect(getRequest(req.id)?.collectionId).toBe(colB.id)
  })

  it('collections — create and list', () => {
    const col = createCollection({ name: 'Integration Collection' })
    expect(col.name).toBe('Integration Collection')
    expect(listCollections().some((c) => c.id === col.id)).toBe(true)
  })

  it('requests — save, get, delete lifecycle', () => {
    const col = createCollection({ name: 'Req Collection' })
    const saved = saveRequest({
      collectionId: col.id,
      name: 'Saved Request',
      method: 'GET',
      url: 'https://httpbin.org/get'
    })
    expect(saved.id).toBeTruthy()

    const loaded = getRequest(saved.id)
    expect(loaded?.name).toBe('Saved Request')
    expect(loaded?.url).toBe('https://httpbin.org/get')

    deleteRequest(saved.id)
    expect(getRequest(saved.id)).toBeNull()
  })

  it('environments — save and activate', () => {
    const env = saveEnvironment({
      name: 'Test Env',
      variables: [{ id: '1', key: 'baseUrl', value: 'https://test.local', enabled: true }]
    })
    setActiveEnvironment(env.id)
    const active = getActiveEnvironment()
    expect(active?.id).toBe(env.id)
    expect(active?.variables[0].value).toBe('https://test.local')
  })

  it('history — add and list entries', () => {
    const req = saveRequest({ name: 'History Req', method: 'GET', url: 'https://example.com' })
    addHistory(req, {
      statusCode: 200,
      statusText: 'OK',
      headers: {},
      body: 'ok',
      durationMs: 12,
      sizeBytes: 2,
      cookies: []
    }, req.id)

    const history = listHistory(10)
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].url).toBe('https://example.com')

    clearHistory()
    expect(listHistory(10)).toHaveLength(0)
  })
})
