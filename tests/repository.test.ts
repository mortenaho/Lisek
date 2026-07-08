import { describe, it, expect } from 'vitest'
import { rowToRequest, requestToRow, createEmptyRequest } from '../src/main/services/repository'
import { sampleRequest } from './helpers'

describe('Repository mappers', () => {
  it('createEmptyRequest — returns valid defaults', () => {
    const req = createEmptyRequest('col-1')
    expect(req.method).toBe('GET')
    expect(req.collectionId).toBe('col-1')
    expect(req.bodyType).toBe('none')
    expect(req.protocol).toBe('http')
    expect(req.id).toBeTruthy()
  })

  it('requestToRow + rowToRequest — round-trip preserves data', () => {
    const original = sampleRequest({
      tags: ['api', 'smoke'],
      notes: 'Regression check',
      lastResponse: {
        statusCode: 201,
        statusText: 'Created',
        headers: {},
        body: '{"id":1}',
        durationMs: 50,
        sizeBytes: 7,
        cookies: []
      },
      lastTestResults: [{ name: 'ok', passed: true }]
    })

    const row = requestToRow(original)
    const restored = rowToRequest({
      ...row,
      sort_order: original.sortOrder,
      pinned: original.pinned ? 1 : 0,
      tags_json: JSON.stringify(original.tags || []),
      notes: original.notes || '',
      created_at: original.createdAt,
      updated_at: original.updatedAt,
      last_response_json: JSON.stringify(original.lastResponse),
      last_test_results_json: JSON.stringify(original.lastTestResults)
    })

    expect(restored.name).toBe(original.name)
    expect(restored.tags).toEqual(original.tags)
    expect(restored.notes).toBe(original.notes)
    expect(restored.method).toBe(original.method)
    expect(restored.url).toBe(original.url)
    expect(restored.bodyRaw).toBe(original.bodyRaw)
    expect(restored.headers).toEqual(original.headers)
    expect(restored.lastResponse?.statusCode).toBe(201)
    expect(restored.lastTestResults?.[0].passed).toBe(true)
  })
})
