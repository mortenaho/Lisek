import type { CollectionRunResult, HttpRequestPayload, KeyValue } from '../../../shared/types'
import { resolveCollectionVariables } from '../../../shared/collectionVariables'
import { listRequests, saveRequestLastResponse, listCollections, getActiveEnvironment, saveEnvironment } from './repository'
import { sendHttpRequest } from './http.service'
import { runScript } from './script.service'

function collectCollectionRequestIds(collectionId: string, allCollections: { id: string; parentId: string | null }[]): string[] {
  const childIds = allCollections.filter((c) => c.parentId === collectionId).map((c) => c.id)
  return [collectionId, ...childIds.flatMap((id) => collectCollectionRequestIds(id, allCollections))]
}

export async function runCollection(
  collectionId: string,
  options: { sslVerify?: boolean; timeoutMs?: number; followRedirects?: boolean; stopOnFailure?: boolean } = {}
): Promise<CollectionRunResult[]> {
  const collections = listCollections()
  const collectionIds = collectCollectionRequestIds(collectionId, collections)
  const allRequests = listRequests()
    .filter((r) => r.collectionId && collectionIds.includes(r.collectionId))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const activeEnv = getActiveEnvironment()
  const envVars = activeEnv?.variables || []
  const results: CollectionRunResult[] = []

  for (const req of allRequests) {
    if (req.protocol !== 'http' && req.protocol !== 'graphql') {
      results.push({
        requestId: req.id,
        requestName: req.name,
        statusCode: 0,
        passed: false,
        error: `Skipped (${req.protocol} not supported in runner)`,
        durationMs: 0
      })
      continue
    }

    try {
      const collectionVars = resolveCollectionVariables(req.collectionId, collections)

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
        sslVerify: options.sslVerify,
        timeoutMs: options.timeoutMs,
        followRedirects: options.followRedirects
      })

      let testResults: { name: string; passed: boolean; error?: string }[] = []
      let environmentChanges = envVars

      if (payload.testScript) {
        const scriptResult = runScript(
          payload.testScript,
          { request: processedPayload, response, environmentVars: envVars, collectionVars: resolvedCollectionVars },
          'test'
        )
        testResults = scriptResult.testResults
        environmentChanges = scriptResult.environmentChanges
      }

      if (activeEnv && environmentChanges !== envVars) {
        saveEnvironment({ ...activeEnv, variables: environmentChanges })
      }

      saveRequestLastResponse(req.id, response, testResults)

      const passed = testResults.length === 0 || testResults.every((t) => t.passed)
      results.push({
        requestId: req.id,
        requestName: req.name,
        statusCode: response.statusCode,
        passed,
        error: testResults.find((t) => !t.passed)?.error,
        durationMs: response.durationMs
      })

      if (!passed && options.stopOnFailure) break
    } catch (e) {
      results.push({
        requestId: req.id,
        requestName: req.name,
        statusCode: 0,
        passed: false,
        error: e instanceof Error ? e.message : String(e),
        durationMs: 0
      })
      if (options.stopOnFailure) break
    }
  }

  return results
}
