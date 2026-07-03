import { v4 as uuidv4 } from 'uuid'
import type { KeyValue } from '../../../shared/types'

const DYNAMIC_VARS: Record<string, () => string> = {
  $timestamp: () => String(Date.now()),
  $randomUUID: () => uuidv4(),
  $guid: () => uuidv4()
}

export function substituteVariables(
  text: string,
  envVars: KeyValue[],
  collectionVars: KeyValue[] = []
): string {
  const varMap = new Map<string, string>()

  for (const v of collectionVars) {
    if (v.enabled && v.key) varMap.set(v.key, v.value)
  }
  for (const v of envVars) {
    if (v.enabled && v.key) varMap.set(v.key, v.value)
  }

  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const trimmed = key.trim()
    if (trimmed.startsWith('$')) {
      const fn = DYNAMIC_VARS[trimmed]
      if (fn) return fn()
    }
    return varMap.get(trimmed) ?? `{{${trimmed}}}`
  })
}

export function substituteKeyValues(
  items: KeyValue[],
  envVars: KeyValue[],
  collectionVars: KeyValue[] = []
): KeyValue[] {
  return items.map((item) => ({
    ...item,
    key: substituteVariables(item.key, envVars, collectionVars),
    value: substituteVariables(item.value, envVars, collectionVars)
  }))
}
