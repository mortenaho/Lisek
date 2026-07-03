import { getIntrospectionQuery } from 'graphql'
import type { KeyValue } from '../../../shared/types'
import {
  applyCookieHeader,
  extractSetCookieHeaders,
  storeSetCookieHeaders
} from './cookie-jar.service'

function buildHeaders(url: string, headers: KeyValue[]): Record<string, string> {
  const headerMap: Record<string, string> = { 'Content-Type': 'application/json' }
  for (const h of headers) {
    if (h.enabled && h.key) headerMap[h.key] = h.value
  }
  applyCookieHeader(new URL(url), headerMap)
  return headerMap
}

function storeResponseCookies(url: string, response: Response): void {
  storeSetCookieHeaders(extractSetCookieHeaders(response), new URL(url))
}

export async function introspectGraphQL(
  url: string,
  headers: KeyValue[] = []
): Promise<unknown> {
  const headerMap = buildHeaders(url, headers)

  const response = await fetch(url, {
    method: 'POST',
    headers: headerMap,
    body: JSON.stringify({ query: getIntrospectionQuery() })
  })
  storeResponseCookies(url, response)

  const json = await response.json()
  if (json.data?.__schema) {
    return json.data
  }
  return json
}

export async function executeGraphQL(
  url: string,
  query: string,
  variables: string,
  headers: KeyValue[] = []
): Promise<{ data?: unknown; errors?: unknown[] }> {
  const headerMap = buildHeaders(url, headers)

  let parsedVars = {}
  try {
    parsedVars = JSON.parse(variables || '{}')
  } catch {
    parsedVars = {}
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headerMap,
    body: JSON.stringify({ query, variables: parsedVars })
  })
  storeResponseCookies(url, response)

  return response.json()
}
