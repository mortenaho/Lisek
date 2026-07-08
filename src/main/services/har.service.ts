import { writeFileSync } from 'fs'
import type { HistoryModel } from '../../../shared/types'
import { getRequest, listHistory } from './repository'

export function exportHarFromHistory(historyId: string, filePath: string): void {
  const entry = listHistory(500).find((h) => h.id === historyId)
  if (!entry) throw new Error('History entry not found')
  writeFileSync(filePath, JSON.stringify(buildHarFromHistory(entry), null, 2), 'utf-8')
}

export function exportHarFromRequest(requestId: string, filePath: string): void {
  const req = getRequest(requestId)
  if (!req?.lastResponse) throw new Error('No response available for this request')
  const started = Date.now() - req.lastResponse.durationMs
  writeFileSync(
    filePath,
    JSON.stringify(
      {
        log: {
          version: '1.2',
          creator: { name: 'Lisek', version: '1.3.0' },
          entries: [
            {
              startedDateTime: new Date(started).toISOString(),
              time: req.lastResponse.durationMs,
              request: {
                method: req.method,
                url: req.url,
                httpVersion: 'HTTP/1.1',
                headers: req.headers
                  .filter((h) => h.enabled && h.key)
                  .map((h) => ({ name: h.key, value: h.value })),
                queryString: req.params
                  .filter((p) => p.enabled && p.key)
                  .map((p) => ({ name: p.key, value: p.value })),
                headersSize: -1,
                bodySize: req.bodyRaw?.length ?? 0,
                postData:
                  req.bodyType === 'raw' && req.bodyRaw
                    ? { mimeType: req.bodyRawContentType, text: req.bodyRaw }
                    : undefined
              },
              response: {
                status: req.lastResponse.statusCode,
                statusText: req.lastResponse.statusText,
                httpVersion: 'HTTP/1.1',
                headers: Object.entries(req.lastResponse.headers).map(([name, value]) => ({ name, value })),
                content: {
                  size: req.lastResponse.sizeBytes,
                  mimeType: req.lastResponse.headers['content-type'] || 'text/plain',
                  text: req.lastResponse.body
                },
                headersSize: -1,
                bodySize: req.lastResponse.sizeBytes
              },
              cache: {},
              timings: { send: 0, wait: req.lastResponse.durationMs, receive: 0 }
            }
          ]
        }
      },
      null,
      2
    ),
    'utf-8'
  )
}

function buildHarFromHistory(entry: HistoryModel) {
  const req = entry.requestSnapshot
  const res = entry.responseSnapshot
  const started = entry.sentAt - res.durationMs

  return {
    log: {
      version: '1.2',
      creator: { name: 'Lisek', version: '1.3.0' },
      entries: [
        {
          startedDateTime: new Date(started).toISOString(),
          time: res.durationMs,
          request: {
            method: req.method,
            url: req.url,
            httpVersion: 'HTTP/1.1',
            headers: req.headers
              .filter((h) => h.enabled && h.key)
              .map((h) => ({ name: h.key, value: h.value })),
            queryString: req.params
              .filter((p) => p.enabled && p.key)
              .map((p) => ({ name: p.key, value: p.value })),
            headersSize: -1,
            bodySize: req.bodyRaw?.length ?? 0,
            postData:
              req.bodyType === 'raw' && req.bodyRaw
                ? { mimeType: req.bodyRawContentType, text: req.bodyRaw }
                : undefined
          },
          response: {
            status: res.statusCode,
            statusText: res.statusText,
            httpVersion: 'HTTP/1.1',
            headers: Object.entries(res.headers).map(([name, value]) => ({ name, value })),
            content: {
              size: res.sizeBytes,
              mimeType: res.headers['content-type'] || 'text/plain',
              text: res.body
            },
            headersSize: -1,
            bodySize: res.sizeBytes
          },
          cache: {},
          timings: { send: 0, wait: res.durationMs, receive: 0 }
        }
      ]
    }
  }
}
