import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { exportWorkspace, importWorkspace } from '../src/main/services/workspace.service'
import { initDatabase } from '../src/main/db/index'
import { createCollection, listCollections, listRequests, saveRequest, createEmptyRequest } from '../src/main/services/repository'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('workspace.service', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lisek-workspace-'))
  const dbPath = join(dir, 'test.db')
  const backupPath = join(dir, 'backup.json')

  beforeAll(async () => {
    await initDatabase(dbPath)
    const col = createCollection({ name: 'Backup Test' })
    saveRequest({ ...createEmptyRequest(col.id), name: 'Ping', url: 'https://example.com/ping' })
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('exports and restores workspace data', () => {
    exportWorkspace(backupPath)
    expect(existsSync(backupPath)).toBe(true)
    const backup = JSON.parse(readFileSync(backupPath, 'utf-8'))
    expect(backup.version).toBe(1)
    expect(backup.collections.length).toBeGreaterThan(0)
    expect(backup.requests.length).toBeGreaterThan(0)

    importWorkspace(backupPath)
    expect(listCollections().some((c) => c.name === 'Backup Test')).toBe(true)
    expect(listRequests().some((r) => r.name === 'Ping')).toBe(true)
  })
})
