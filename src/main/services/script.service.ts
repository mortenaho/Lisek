import vm from 'node:vm'
import type { HttpRequestPayload, HttpResponse, KeyValue, TestResult } from '../../../shared/types'

export interface ScriptContext {
  request: HttpRequestPayload
  response?: HttpResponse
  environmentVars: KeyValue[]
  collectionVars: KeyValue[]
}

export interface ScriptResult {
  environmentChanges: KeyValue[]
  collectionChanges: KeyValue[]
  requestChanges: Partial<HttpRequestPayload>
  testResults: TestResult[]
  console: string[]
}

export function runScript(
  script: string,
  context: ScriptContext,
  phase: 'prerequest' | 'test'
): ScriptResult {
  const result: ScriptResult = {
    environmentChanges: [...context.environmentVars],
    collectionChanges: [...context.collectionVars],
    requestChanges: {},
    testResults: [],
    console: []
  }

  if (!script?.trim()) return result

  const envMap = new Map(context.environmentVars.map((v) => [v.key, v.value]))
  const colMap = new Map(context.collectionVars.map((v) => [v.key, v.value]))
  const testResults: TestResult[] = []

  const pm = {
    environment: {
      set: (key: string, value: string) => envMap.set(key, value),
      get: (key: string) => envMap.get(key),
      unset: (key: string) => { envMap.delete(key) }
    },
    collectionVariables: {
      set: (key: string, value: string) => colMap.set(key, value),
      get: (key: string) => colMap.get(key),
      unset: (key: string) => { colMap.delete(key) }
    },
    request: {
      method: context.request.method,
      url: context.request.url,
      headers: Object.fromEntries(
        context.request.headers.filter((h) => h.enabled).map((h) => [h.key, h.value])
      ),
      body: context.request.bodyRaw
    },
    response: context.response
      ? {
          code: context.response.statusCode,
          status: context.response.statusText,
          headers: context.response.headers,
          text: () => context.response!.body,
          json: () => {
            try { return JSON.parse(context.response!.body) } catch { return null }
          }
        }
      : null,
    test: (name: string, fn: () => void) => {
      try {
        fn()
        testResults.push({ name, passed: true })
      } catch (e) {
        testResults.push({ name, passed: false, error: e instanceof Error ? e.message : String(e) })
      }
    },
    expect: (actual: unknown) => ({
      to: {
        equal: (expected: unknown) => {
          if (actual !== expected) throw new Error(`Expected ${expected} but got ${actual}`)
        },
        eql: (expected: unknown) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`)
          }
        },
        be: {
          ok: () => { if (!actual) throw new Error(`Expected truthy value but got ${actual}`) }
        }
      }
    }),
    variables: {
      set: (key: string, value: string) => envMap.set(key, value),
      get: (key: string) => envMap.get(key)
    }
  }

  try {
    const sandbox = { pm, console: { log: (...args: unknown[]) => result.console.push(args.map(String).join(' ')) } }
    vm.createContext(sandbox)
    vm.runInContext(script, sandbox, { timeout: 5000, filename: `${phase}-script.js` })
  } catch (e) {
    if (phase === 'test') {
      testResults.push({
        name: 'Script execution',
        passed: false,
        error: e instanceof Error ? e.message : String(e)
      })
    } else {
      result.console.push(`Pre-request script error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  result.environmentChanges = Array.from(envMap.entries()).map(([key, value], i) => ({
    id: String(i), key, value, enabled: true
  }))
  result.collectionChanges = Array.from(colMap.entries()).map(([key, value], i) => ({
    id: String(i), key, value, enabled: true
  }))
  result.testResults = testResults

  return result
}
