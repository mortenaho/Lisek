import type { CollectionModel, KeyValue } from './types'

/** Merge collection variables from root → leaf; child values override parent keys. */
export function resolveCollectionVariables(
  collectionId: string | null | undefined,
  collections: CollectionModel[]
): KeyValue[] {
  if (!collectionId) return []

  const byId = new Map(collections.map((collection) => [collection.id, collection]))
  const chain: string[] = []
  let currentId: string | null | undefined = collectionId

  while (currentId) {
    chain.unshift(currentId)
    currentId = byId.get(currentId)?.parentId ?? null
  }

  const merged = new Map<string, KeyValue>()
  for (const id of chain) {
    for (const variable of byId.get(id)?.variables ?? []) {
      if (variable.enabled && variable.key) {
        merged.set(variable.key, variable)
      }
    }
  }

  return [...merged.values()]
}
