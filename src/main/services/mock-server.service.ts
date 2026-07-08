import http from 'http'
import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { MockRoute, MockServerState } from '../../../shared/types'

const HEALTH_PATH = '/__lisek/mock/health'

interface MockStore {
  routes: Map<string, MockRoute>
  server: http.Server | null
  port: number
  routesLoaded: boolean
}

const GLOBAL_KEY = '__lisekMockServerStore'

function routesFilePath(): string {
  return join(app.getPath('userData'), 'mock-routes.json')
}

function loadPersistedRoutes(): MockRoute[] {
  try {
    if (!app.isReady()) return []
    const filePath = routesFilePath()
    if (!existsSync(filePath)) return []
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
    return Array.isArray(parsed) ? (parsed as MockRoute[]) : []
  } catch {
    return []
  }
}

function persistRoutes(routes: Map<string, MockRoute>): void {
  try {
    if (!app.isReady()) return
    writeFileSync(routesFilePath(), JSON.stringify(Array.from(routes.values()), null, 2), 'utf8')
  } catch {
    // ignore persistence errors
  }
}

function ensureRoutesLoaded(store: MockStore): void {
  if (store.routesLoaded) return
  store.routesLoaded = true
  for (const route of loadPersistedRoutes()) {
    if (!route?.id || !route.path) continue
    store.routes.set(route.id, {
      ...route,
      method: route.method.trim().toUpperCase() || 'GET',
      path: normalizeMockPath(route.path)
    })
  }
}

function getStore(): MockStore {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: MockStore }
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { routes: new Map(), server: null, port: 0, routesLoaded: false }
  }
  ensureRoutesLoaded(g[GLOBAL_KEY])
  return g[GLOBAL_KEY]
}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'access-control-allow-headers': '*'
  }
}

export function normalizeMockPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed || trimmed === '*') return trimmed === '*' ? '*' : '/'

  let pathname = trimmed
  if (trimmed.includes('://')) {
    try {
      pathname = new URL(trimmed).pathname
    } catch {
      pathname = trimmed
    }
  }

  const withoutQuery = pathname.split('?')[0]
  const withSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
  const normalized = withSlash.replace(/\/+$/, '')
  return normalized || '/'
}

function buildState(store: MockStore): MockServerState {
  return {
    running: store.server !== null,
    port: store.port,
    baseUrl: store.server ? `http://127.0.0.1:${store.port}` : '',
    routes: Array.from(store.routes.values())
  }
}

function matchRoute(store: MockStore, method: string, pathname: string): MockRoute | null {
  const normalizedMethod = method.toUpperCase()
  const normalizedPath = normalizeMockPath(pathname)

  for (const route of store.routes.values()) {
    const routePath = normalizeMockPath(route.path)
    const routeMethod = route.method.toUpperCase()
    if (routeMethod !== normalizedMethod && routeMethod !== 'ANY' && routeMethod !== '*') continue
    if (routePath === '*' || routePath === normalizedPath) return route
  }
  return null
}

function createRequestHandler(store: MockStore) {
  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders())
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${store.port || 80}`)

    if (url.pathname === HEALTH_PATH) {
      res.writeHead(200, { 'content-type': 'application/json', ...corsHeaders() })
      res.end(
        JSON.stringify({
          ok: true,
          lisekMock: true,
          routes: store.routes.size,
          routeList: Array.from(store.routes.values()).map((r) => `${r.method} ${r.path}`)
        })
      )
      return
    }

    const route = matchRoute(store, req.method || 'GET', url.pathname)
    if (!route) {
      const available = Array.from(store.routes.values()).map((r) => `${r.method} ${r.path}`)
      res.writeHead(404, { 'content-type': 'application/json', ...corsHeaders() })
      res.end(
        JSON.stringify({
          error: 'No mock route matched',
          method: req.method,
          path: url.pathname,
          configuredRoutes: available,
          hint:
            available.length === 0
              ? 'Open Mock Server in Lisek, click Start, then retry.'
              : `Try one of: ${available.join(', ')}`
        })
      )
      return
    }

    const headers = { ...corsHeaders(), ...route.headers }
    if (!headers['content-type']) {
      headers['content-type'] = 'application/json'
    }
    res.writeHead(route.statusCode, headers)
    res.end(route.body)
  }
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve())
  })
}

function killListenersOnPort(port: number): void {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8' })
      const pids = new Set<string>()
      for (const line of output.split('\n')) {
        if (!line.includes('LISTENING')) continue
        const parts = line.trim().split(/\s+/)
        const pid = parts[parts.length - 1]
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        } catch {
          // ignore per-process failures
        }
      }
      return
    }

    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim()
    if (!output) return
    for (const pid of output.split('\n')) {
      if (!pid) continue
      try {
        process.kill(Number(pid), 'SIGTERM')
      } catch {
        // ignore
      }
    }
  } catch {
    // port may already be free
  }
}

async function listenOnPort(store: MockStore, port: number): Promise<http.Server> {
  const tryOnce = (retried: boolean): Promise<http.Server> =>
    new Promise((resolve, reject) => {
      const nextServer = http.createServer(createRequestHandler(store))
      nextServer.once('error', async (err: NodeJS.ErrnoException) => {
        await closeServer(nextServer)
        if (!retried && err.code === 'EADDRINUSE' && port > 0) {
          killListenersOnPort(port)
          await new Promise((r) => setTimeout(r, 250))
          try {
            resolve(await tryOnce(true))
          } catch (retryErr) {
            reject(retryErr)
          }
          return
        }
        reject(err)
      })
      nextServer.listen(port, '127.0.0.1', () => resolve(nextServer))
    })

  return tryOnce(false)
}

export function getMockServerState(): MockServerState {
  return buildState(getStore())
}

export async function startMockServer(requestedPort = 0): Promise<MockServerState> {
  const store = getStore()

  if (store.server) {
    return buildState(store)
  }

  const nextServer = await listenOnPort(store, requestedPort)
  store.server = nextServer
  const address = nextServer.address()
  store.port = typeof address === 'object' && address ? address.port : requestedPort
  return buildState(store)
}

export async function restartMockServer(requestedPort = 0): Promise<MockServerState> {
  await stopMockServer()
  return startMockServer(requestedPort)
}

export async function stopMockServer(): Promise<MockServerState> {
  const store = getStore()
  if (!store.server) return buildState(store)

  const current = store.server
  store.server = null
  store.port = 0
  await closeServer(current)
  return buildState(store)
}

export function addMockRoute(route: Omit<MockRoute, 'id'>): MockServerState {
  const store = getStore()
  const id = uuidv4()
  store.routes.set(id, {
    ...route,
    id,
    method: route.method.trim().toUpperCase() || 'GET',
    path: normalizeMockPath(route.path)
  })
  persistRoutes(store.routes)
  return buildState(store)
}

export function removeMockRoute(id: string): MockServerState {
  const store = getStore()
  store.routes.delete(id)
  persistRoutes(store.routes)
  return buildState(store)
}

export function clearMockRoutes(): MockServerState {
  const store = getStore()
  store.routes.clear()
  persistRoutes(store.routes)
  return buildState(store)
}

export function ensureMockRoute(route: Omit<MockRoute, 'id'>): MockServerState {
  const store = getStore()
  const method = route.method.trim().toUpperCase() || 'GET'
  const path = normalizeMockPath(route.path)

  for (const existing of store.routes.values()) {
    if (existing.method.toUpperCase() === method && normalizeMockPath(existing.path) === path) {
      return buildState(store)
    }
  }

  return addMockRoute(route)
}

/** @deprecated use ensureMockRoute */
export function seedDefaultRouteIfEmpty(route: Omit<MockRoute, 'id'>): MockServerState {
  const store = getStore()
  if (store.routes.size > 0) return buildState(store)
  return addMockRoute(route)
}

export async function shutdownMockServer(): Promise<void> {
  await stopMockServer()
}
