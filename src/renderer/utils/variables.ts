import type { KeyValue } from '@shared/types'

export type VariableSource = 'environment' | 'collection' | 'dynamic' | 'unknown'

export interface VariableSegment {
  type: 'text' | 'variable'
  content: string
  name?: string
  source?: VariableSource
  resolvedValue?: string
}

const DYNAMIC_VARS = new Set(['$timestamp', '$randomUUID', '$guid'])

export function buildVariableMap(envVars: KeyValue[], collectionVars: KeyValue[] = []): Map<string, string> {
  const map = new Map<string, string>()
  for (const v of collectionVars) {
    if (v.enabled && v.key) map.set(v.key, v.value)
  }
  for (const v of envVars) {
    if (v.enabled && v.key) map.set(v.key, v.value)
  }
  return map
}

export function resolveVariable(
  name: string,
  envVars: KeyValue[],
  collectionVars: KeyValue[] = []
): { source: VariableSource; value?: string } {
  if (DYNAMIC_VARS.has(name)) {
    return { source: 'dynamic', value: '(dynamic at runtime)' }
  }
  const env = envVars.find((v) => v.enabled && v.key === name)
  if (env) return { source: 'environment', value: env.value }
  const col = collectionVars.find((v) => v.enabled && v.key === name)
  if (col) return { source: 'collection', value: col.value }
  return { source: 'unknown' }
}

export function parseVariableSegments(
  text: string,
  envVars: KeyValue[],
  collectionVars: KeyValue[] = []
): VariableSegment[] {
  if (!text) return []

  const segments: VariableSegment[] = []
  const regex = /\{\{([^}]*)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    const name = match[1].trim()
    const resolved = resolveVariable(name, envVars, collectionVars)
    segments.push({
      type: 'variable',
      content: match[0],
      name,
      source: resolved.source,
      resolvedValue: resolved.value
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return segments
}

export function getVariableAtIndex(text: string, index: number): VariableSegment | null {
  const regex = /\{\{([^}]*)\}\}/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const start = match.index
    const end = match.index + match[0].length
    if (index >= start && index <= end) {
      return { type: 'variable', content: match[0], name: match[1].trim() }
    }
  }
  return null
}

export interface AutocompleteContext {
  query: string
  replaceStart: number
  replaceEnd: number
}

export function getAutocompleteContext(text: string, cursor: number): AutocompleteContext | null {
  const before = text.slice(0, cursor)
  const match = before.match(/\{\{([^}]*)$/)
  if (!match) return null
  const query = match[1]
  return {
    query,
    replaceStart: cursor - query.length,
    replaceEnd: cursor
  }
}

export function collectVariableNames(envVars: KeyValue[], collectionVars: KeyValue[] = []): string[] {
  const names = new Set<string>()
  for (const v of collectionVars) {
    if (v.enabled && v.key) names.add(v.key)
  }
  for (const v of envVars) {
    if (v.enabled && v.key) names.add(v.key)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
