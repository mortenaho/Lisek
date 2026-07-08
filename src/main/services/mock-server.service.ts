import http from 'http'
import { v4 as uuidv4 } from 'uuid'
import type { MockRoute, MockServerState } from '../../../shared/types'

interface MockStore {
  routes: Map<string, MockRoute>
  server: http.Server | null
  port: number
}

const GLOBAL_KEY = '__lisekMockServerStore'

function getStore(): MockStore {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: MockStore }
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { routes: new Map(), server: null, port: 0 }
  }
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
          hint: available.length === 0 ? 'Add a route in Mock Server before sending requests.' : undefined
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

export function getMockServerState(): MockServerState {
  return buildState(getStore())
}

export async function startMockServer(requestedPort = 0): Promise<MockServerState> {
  const store = getStore()

  if (store.server) {
    return buildState(store)
  }

  const nextServer = http.createServer(createRequestHandler(store))

  try {
    await new Promise<void>((resolve, reject) => {
      nextServer.once('error', reject)
      nextServer.listen(requestedPort, '127.0.0.1', () => resolve())
    })
  } catch (err) {
    await closeServer(nextServer)
    throw err
  }

  store.server = nextServer
  const address = nextServer.address()
  store.port = typeof address === 'object' && address ? address.port : requestedPort
  return buildState(store)
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
  return buildState(store)
}

export function removeMockRoute(id: string): MockServerState {
  getStore().routes.delete(id)
  return buildState(getStore())
}

export function clearMockRoutes(): MockServerState {
  getStore().routes.clear()
  return buildState(getStore())
}

export function seedDefaultRouteIfEmpty(route: Omit<MockRoute, 'id'>): MockServerState {
  const store = getStore()
  if (store.routes.size > 0) return buildState(store)
  return addMockRoute(route)
}
