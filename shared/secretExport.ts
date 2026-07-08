import type { KeyValue } from './types'

/** Strip secret values before exporting to external formats. */
export function maskSecretKeyValues(items: KeyValue[]): KeyValue[] {
  return items.map((item) => (item.secret ? { ...item, value: '' } : item))
}

export function maskSecretValue(item: KeyValue): string {
  return item.secret ? '' : item.value
}
