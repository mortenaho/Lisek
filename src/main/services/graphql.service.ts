import { getIntrospectionQuery } from 'graphql'
import type { KeyValue } from '../../../shared/types'
import { fetchWithCookieJar } from './http-fetch.service'

function buildHeaders(headers: KeyValue[]): Record<string, string> {
  const headerMap: Record<string, string> = { 'Content-Type': 'application/json' }
  for (const h of headers) {
    if (h.enabled && h.key) headerMap[h.key] = h.value
  }
  return headerMap
}

export async function introspectGraphQL(
  url: string,
  headers: KeyValue[] = []
): Promise<unknown> {
  const { response } = await fetchWithCookieJar(url, {
    method: 'POST',
    headers: buildHeaders(headers),
    body: JSON.stringify({ query: getIntrospectionQuery() })
  })

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
  let parsedVars = {}
  try {
    parsedVars = JSON.parse(variables || '{}')
  } catch {
    parsedVars = {}
  }

  const { response } = await fetchWithCookieJar(url, {
    method: 'POST',
    headers: buildHeaders(headers),
    body: JSON.stringify({ query, variables: parsedVars })
  })

  return response.json()
}
