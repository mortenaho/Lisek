import { Notification } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { HttpRequestPayload, ScheduledJobModel } from '../../../shared/types'
import { getAll, getOne, runQuery } from '../db'
import { getSettings } from '../db'
import { sendHttpRequest } from './http.service'
import { runScript } from './script.service'
import { resolveCollectionVariables } from '../../../shared/collectionVariables'
import {
  addHistory,
  getActiveEnvironment,
  getRequest,
  listCollections
} from './repository'

const timers = new Map<string, ReturnType<typeof setInterval>>()

function rowToJob(row: {
  id: string
  request_id: string
  schedule_expr: string
  enabled: number
  notify: number
  last_run_at: number | null
  created_at: number
}): ScheduledJobModel {
  return {
    id: row.id,
    requestId: row.request_id,
    scheduleExpr: row.schedule_expr,
    enabled: Boolean(row.enabled),
    notify: Boolean(row.notify),
    lastRunAt: row.last_run_at ?? undefined,
    createdAt: row.created_at
  }
}

export function listScheduledJobs(): ScheduledJobModel[] {
  return getAll<{
    id: string
    request_id: string
    schedule_expr: string
    enabled: number
    notify: number
    last_run_at: number | null
    created_at: number
  }>('SELECT * FROM scheduled_jobs ORDER BY created_at DESC').map(rowToJob)
}

export function saveScheduledJob(
  data: Partial<ScheduledJobModel> & { requestId: string; scheduleExpr: string }
): ScheduledJobModel {
  const existing = data.id ? getOne<{ id: string }>('SELECT id FROM scheduled_jobs WHERE id = ?', [data.id]) : null
  const id = existing?.id || data.id || uuidv4()
  const now = Date.now()
  const notify = data.notify ?? true
  const enabled = data.enabled ?? true

  if (existing) {
    runQuery(
      'UPDATE scheduled_jobs SET request_id = ?, schedule_expr = ?, enabled = ?, notify = ?, last_run_at = ? WHERE id = ?',
      [data.requestId, data.scheduleExpr, enabled ? 1 : 0, notify ? 1 : 0, data.lastRunAt ?? null, id]
    )
  } else {
    runQuery(
      'INSERT INTO scheduled_jobs (id, request_id, schedule_expr, enabled, notify, last_run_at, created_at) VALUES (?,?,?,?,?,?,?)',
      [id, data.requestId, data.scheduleExpr, enabled ? 1 : 0, notify ? 1 : 0, null, now]
    )
  }

  const job = rowToJob(
    getOne('SELECT * FROM scheduled_jobs WHERE id = ?', [id]) as {
      id: string
      request_id: string
      schedule_expr: string
      enabled: number
      notify: number
      last_run_at: number | null
      created_at: number
    }
  )

  refreshJobTimer(job)
  return job
}

export function deleteScheduledJob(id: string): void {
  stopJobTimer(id)
  runQuery('DELETE FROM scheduled_jobs WHERE id = ?', [id])
}

export function parseEveryMs(expr: string): number {
  const trimmed = expr.trim()
  const match = trimmed.match(/^@every\s+(\d+)\s*(s|m|h)$/i)
  if (!match) throw new Error('Use schedule format @every 30s, @every 5m, or @every 1h')
  const amount = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  if (unit === 's') return amount * 1000
  if (unit === 'm') return amount * 60_000
  return amount * 3_600_000
}

async function executeScheduledJob(job: ScheduledJobModel): Promise<void> {
  const req = getRequest(job.requestId)
  if (!req) throw new Error('Request not found')
  if (req.protocol !== 'http' && req.protocol !== 'graphql') {
    throw new Error(`Protocol ${req.protocol} is not supported for schedules`)
  }

  const settings = getSettings()
  const activeEnv = getActiveEnvironment()
  const envVars = activeEnv?.variables ?? []
  const collectionVars = resolveCollectionVariables(req.collectionId, listCollections())

  const payload: HttpRequestPayload = {
    requestId: req.id,
    method: req.method,
    url: req.url,
    headers: req.headers,
    params: req.params,
    bodyType: req.protocol === 'graphql' ? 'raw' : req.bodyType,
    bodyRaw:
      req.protocol === 'graphql'
        ? JSON.stringify({ query: req.graphqlQuery, variables: JSON.parse(req.graphqlVariables || '{}') })
        : req.bodyRaw,
    bodyRawContentType: req.protocol === 'graphql' ? 'application/json' : req.bodyRawContentType,
    formData: req.formData,
    urlEncoded: req.urlEncoded,
    authType: req.authType,
    auth: req.auth,
    preRequestScript: req.preRequestScript,
    testScript: req.testScript,
    collectionVariables: collectionVars
  }

  let processedPayload = { ...payload }
  let resolvedCollectionVars = collectionVars
  if (payload.preRequestScript) {
    const scriptResult = runScript(
      payload.preRequestScript,
      { request: payload, environmentVars: envVars, collectionVars: resolvedCollectionVars },
      'prerequest'
    )
    if (scriptResult.requestChanges.url) processedPayload.url = scriptResult.requestChanges.url
    resolvedCollectionVars = scriptResult.collectionChanges
  }

  const response = await sendHttpRequest(processedPayload, envVars, resolvedCollectionVars, {
    sslVerify: settings.sslVerify,
    timeoutMs: settings.timeoutMs,
    followRedirects: settings.followRedirects,
    proxyUrl: settings.proxyUrl
  })

  addHistory(req, response, req.id)

  runQuery('UPDATE scheduled_jobs SET last_run_at = ? WHERE id = ?', [Date.now(), job.id])

  if (job.notify && Notification.isSupported()) {
    const ok = response.statusCode >= 200 && response.statusCode < 300
    new Notification({
      title: ok ? 'Scheduled request succeeded' : 'Scheduled request failed',
      body: `${req.method} ${req.name} → ${response.statusCode}`
    }).show()
  }
}

function stopJobTimer(jobId: string): void {
  const timer = timers.get(jobId)
  if (timer) clearInterval(timer)
  timers.delete(jobId)
}

function refreshJobTimer(job: ScheduledJobModel): void {
  stopJobTimer(job.id)
  if (!job.enabled) return

  const intervalMs = parseEveryMs(job.scheduleExpr)
  const timer = setInterval(() => {
    void executeScheduledJob(job).catch((err) => {
      if (job.notify && Notification.isSupported()) {
        new Notification({
          title: 'Scheduled request error',
          body: err instanceof Error ? err.message : 'Unknown error'
        }).show()
      }
    })
  }, intervalMs)
  timers.set(job.id, timer)
}

export function initScheduledJobs(): void {
  for (const job of listScheduledJobs()) {
    if (job.enabled) refreshJobTimer(job)
  }
}

export async function runScheduledJobNow(id: string): Promise<void> {
  const job = listScheduledJobs().find((j) => j.id === id)
  if (!job) throw new Error('Scheduled job not found')
  await executeScheduledJob(job)
}

export function shutdownScheduledJobs(): void {
  for (const id of [...timers.keys()]) stopJobTimer(id)
}
