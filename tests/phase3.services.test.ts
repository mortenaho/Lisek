import { describe, expect, it, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { initDatabase } from '../src/main/db/index'
import { exportBrunoCollection, importBrunoCollection } from '../src/main/services/bruno.service'
import { createCollection, listRequests, saveRequest } from '../src/main/services/repository'
import { createEnvironmentFromSpec, importOpenApiFromContent } from '../src/main/services/openapi.service'
import { parseEveryMs } from '../src/main/services/schedule.service'

const testDir = mkdtempSync(join(tmpdir(), 'lisek-phase3-'))
initDatabase(join(testDir, 'test.db'))

afterAll(() => rmSync(testDir, { recursive: true, force: true }))

describe('bruno.service', () => {
  it('exports and imports a basic .bru request', () => {
    const collection = createCollection({ name: 'Bruno Test' })
    saveRequest({
      collectionId: collection.id,
      name: 'Hello',
      method: 'GET',
      url: 'https://example.com/hello',
      headers: [],
      params: [],
      bodyType: 'none',
      protocol: 'http'
    })

    const outDir = join(testDir, 'export')
    const count = exportBrunoCollection(collection.id, outDir)
    expect(count).toBe(1)

    const imported = importBrunoCollection(outDir)
    expect(imported.count).toBe(1)
    const requests = listRequests(imported.collectionId)
    expect(requests[0]?.url).toBe('https://example.com/hello')
  })
})

describe('openapi environment', () => {
  it('creates environment variables from servers', async () => {
    const content = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Petstore', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }, { url: 'https://staging.example.com' }],
      paths: {
        '/pets': {
          get: { summary: 'List pets', responses: { '200': { description: 'OK' } } }
        }
      }
    })

    const imported = await importOpenApiFromContent(content, 'petstore.json', 'petstore.json', 'json')
    const env = createEnvironmentFromSpec(imported.specId)
    expect(env.variables.find((v) => v.key === 'baseUrl')?.value).toBe('https://api.example.com')
    expect(env.variables.find((v) => v.key === 'baseUrl_2')?.value).toBe('https://staging.example.com')
  })
})

describe('schedule.service', () => {
  it('parses @every expressions', () => {
    expect(parseEveryMs('@every 30s')).toBe(30_000)
    expect(parseEveryMs('@every 5m')).toBe(300_000)
    expect(parseEveryMs('@every 1h')).toBe(3_600_000)
  })
})
