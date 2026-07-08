import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { buildCollectionRunReport, exportRunnerReport } from '../src/main/services/runner.service'
import type { CollectionRunResult } from '../shared/types'
import { initDatabase } from '../src/main/db/index'
import { createCollection } from '../src/main/services/repository'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('runner.service report', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lisek-runner-'))
  beforeAll(async () => {
    await initDatabase(join(dir, 'test.db'))
    createCollection({ id: 'col-1', name: 'Demo Collection' })
  })
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const results: CollectionRunResult[] = [
    {
      requestId: 'r1',
      requestName: 'Health',
      statusCode: 200,
      passed: true,
      durationMs: 12,
      iteration: 1
    },
    {
      requestId: 'r2',
      requestName: 'Users',
      statusCode: 500,
      passed: false,
      error: 'assert failed',
      durationMs: 40,
      iteration: 1
    }
  ]

  it('buildCollectionRunReport summarizes pass/fail counts', () => {
    const report = buildCollectionRunReport('col-1', results, { iterations: 2, delayMs: 100 })
    expect(report.collectionName).toBe('Demo Collection')
    expect(report.passed).toBe(1)
    expect(report.failed).toBe(1)
    expect(report.iterations).toBe(2)
    expect(report.delayMs).toBe(100)
  })

  it('exportRunnerReport writes JSON and HTML', () => {
    const report = buildCollectionRunReport('col-1', results, { iterations: 1, delayMs: 0 })
    report.startedAt = 1
    report.finishedAt = 2

    const jsonPath = join(dir, 'report.json')
    const htmlPath = join(dir, 'report.html')
    exportRunnerReport(report, jsonPath, 'json')
    exportRunnerReport(report, htmlPath, 'html')

    const json = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    expect(json.passed).toBe(1)
    const html = readFileSync(htmlPath, 'utf-8')
    expect(html).toContain('Demo Collection')
    expect(html).toContain('Health')
  })
})
