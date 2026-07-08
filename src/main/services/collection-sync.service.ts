import { mkdirSync, readdirSync, readFileSync, statSync, watch, writeFileSync, existsSync, type FSWatcher } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { CollectionModel, RequestModel } from '../../../shared/types'
import { runQuery } from '../db'
import {
  createCollection,
  getRequest,
  listCollections,
  listRequests,
  saveRequest,
  updateCollection
} from './repository'

const watchers = new Map<string, FSWatcher>()
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

function slugify(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'request'
}

function collectDescendantCollectionIds(rootId: string, collections: CollectionModel[]): string[] {
  const ids = [rootId]
  for (const col of collections.filter((c) => c.parentId === rootId)) {
    ids.push(...collectDescendantCollectionIds(col.id, collections))
  }
  return ids
}

export function exportCollectionToFolder(collectionId: string, folderPath: string): number {
  const collections = listCollections()
  const root = collections.find((c) => c.id === collectionId)
  if (!root) throw new Error('Collection not found')

  mkdirSync(join(folderPath, 'requests'), { recursive: true })
  writeFileSync(
    join(folderPath, 'collection.json'),
    JSON.stringify(
      {
        version: 1,
        name: root.name,
        description: root.description || '',
        variables: root.variables
      },
      null,
      2
    ),
    'utf-8'
  )

  const collectionIds = new Set(collectDescendantCollectionIds(collectionId, collections))
  const requests = listRequests().filter((r) => r.collectionId && collectionIds.has(r.collectionId))
  for (const req of requests) {
    const fileName = `${slugify(req.name)}.json`
    writeFileSync(join(folderPath, 'requests', fileName), JSON.stringify(req, null, 2), 'utf-8')
  }

  updateCollection(collectionId, { syncPath: folderPath })
  return requests.length
}

export function importCollectionFromFolder(
  folderPath: string,
  parentCollectionId: string | null = null,
  targetCollectionId?: string
): { collectionId: string; count: number } {
  const manifest = JSON.parse(readFileSync(join(folderPath, 'collection.json'), 'utf-8')) as {
    name?: string
    description?: string
    variables?: CollectionModel['variables']
  }

  const collection =
    targetCollectionId
      ? updateCollection(targetCollectionId, {
          name: manifest.name || 'Imported Collection',
          description: manifest.description || '',
          variables: manifest.variables || [],
          syncPath: folderPath
        })
      : createCollection({
          name: manifest.name || 'Imported Collection',
          parentId: parentCollectionId,
          description: manifest.description || '',
          variables: manifest.variables || []
        })

  if (targetCollectionId) {
    const collectionIds = collectDescendantCollectionIds(targetCollectionId, listCollections())
    for (const id of collectionIds) {
      runQuery('DELETE FROM requests WHERE collection_id = ?', [id])
    }
  } else {
    updateCollection(collection.id, { syncPath: folderPath })
  }

  const requestsDir = join(folderPath, 'requests')
  let count = 0
  if (statSync(requestsDir, { throwIfNoEntry: false })) {
    for (const file of readdirSync(requestsDir)) {
      if (!file.endsWith('.json')) continue
      const raw = JSON.parse(readFileSync(join(requestsDir, file), 'utf-8')) as Partial<RequestModel>
      saveRequest({
        ...raw,
        id: undefined,
        collectionId: collection.id
      })
      count++
    }
  }

  return { collectionId: collection.id, count }
}

export function linkCollectionFolder(collectionId: string, folderPath: string): CollectionModel {
  return updateCollection(collectionId, { syncPath: folderPath })
}

export function unlinkCollectionFolder(collectionId: string): CollectionModel {
  stopWatchingCollection(collectionId)
  return updateCollection(collectionId, { syncPath: '' })
}

export function pushCollectionToFolder(collectionId: string): number {
  const col = listCollections().find((c) => c.id === collectionId)
  if (!col?.syncPath) throw new Error('Collection is not linked to a folder')
  return exportCollectionToFolder(collectionId, col.syncPath)
}

export function pullCollectionFromFolder(collectionId: string): { count: number } {
  const col = listCollections().find((c) => c.id === collectionId)
  if (!col?.syncPath) throw new Error('Collection is not linked to a folder')
  const result = importCollectionFromFolder(col.syncPath, col.parentId, collectionId)
  return { count: result.count }
}

export function startWatchingCollection(collectionId: string): void {
  const col = listCollections().find((c) => c.id === collectionId)
  if (!col?.syncPath) throw new Error('Collection is not linked to a folder')

  stopWatchingCollection(collectionId)
  const watcher = watch(col.syncPath, { recursive: true }, () => {
    const existing = debounceTimers.get(collectionId)
    if (existing) clearTimeout(existing)
    debounceTimers.set(
      collectionId,
      setTimeout(() => {
        try {
          pullCollectionFromFolder(collectionId)
        } catch {
          /* ignore transient parse errors while files are being written */
        }
      }, 600)
    )
  })
  watchers.set(collectionId, watcher)
}

export function stopWatchingCollection(collectionId: string): void {
  const timer = debounceTimers.get(collectionId)
  if (timer) clearTimeout(timer)
  debounceTimers.delete(collectionId)
  const watcher = watchers.get(collectionId)
  if (watcher) {
    watcher.close()
    watchers.delete(collectionId)
  }
}

export function listWatchedCollections(): string[] {
  return [...watchers.keys()]
}

export function exportRequestOnSave(req: RequestModel): void {
  if (!req.collectionId) return
  const col = listCollections().find((c) => c.id === req.collectionId)
  if (!col?.syncPath) return
  const requestsDir = join(col.syncPath, 'requests')
  if (!statSync(requestsDir, { throwIfNoEntry: false })) return
  const fileName = `${slugify(req.name)}.json`
  writeFileSync(join(requestsDir, fileName), JSON.stringify(getRequest(req.id), null, 2), 'utf-8')
}
