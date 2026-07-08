import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { exportHarFromHistory } from '../src/main/services/har.service'
import { addHistory, createEmptyRequest, listHistory, saveRequest } from '../src/main/services/repository'
import { initDatabase } from '../src/main/db/index'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('har.service', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lisek-har-'))
  let entryId = ''

  beforeAll(async () => {
    await initDatabase(join(dir, 'test.db'))
    const req = saveRequest({ ...createEmptyRequest(null), name: 'HAR test', url: 'https://example.com/api' })
    const response = {
      statusCode: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
      durationMs: 25,
      sizeBytes: 11,
      cookies: []
    }
    addHistory(req, response, req.id)
    entryId = listHistory(1)[0].id
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('exports a HAR file from history', () => {
    const out = join(dir, 'entry.har')
    exportHarFromHistory(entryId, out)

    const har = JSON.parse(readFileSync(out, 'utf-8'))
    expect(har.log.version).toBe('1.2')
    expect(har.log.entries[0].request.url).toBe('https://example.com/api')
    expect(har.log.entries[0].response.status).toBe(200)
  })
})
