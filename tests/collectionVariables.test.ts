import { describe, expect, it } from 'vitest'
import { resolveCollectionVariables } from '../shared/collectionVariables'
import type { CollectionModel } from '../shared/types'
import { kv } from './helpers'

function collection(
  id: string,
  parentId: string | null,
  variables: ReturnType<typeof kv>[] = []
): CollectionModel {
  return {
    id,
    name: id,
    parentId,
    sortOrder: 0,
    pinned: false,
    variables,
    createdAt: 0
  }
}

describe('resolveCollectionVariables', () => {
  const collections = [
    collection('root', null, [kv('baseUrl', 'https://api.example.com'), kv('apiVersion', 'v1')]),
    collection('users', 'root', [kv('resource', 'users')]),
    collection('posts', 'root', [kv('resource', 'posts'), kv('apiVersion', 'v2')])
  ]

  it('inherits parent collection variables for nested folders', () => {
    expect(resolveCollectionVariables('users', collections)).toEqual([
      expect.objectContaining({ key: 'baseUrl', value: 'https://api.example.com' }),
      expect.objectContaining({ key: 'apiVersion', value: 'v1' }),
      expect.objectContaining({ key: 'resource', value: 'users' })
    ])
  })

  it('lets child collection variables override parent keys', () => {
    const resolved = resolveCollectionVariables('posts', collections)
    expect(resolved.find((v) => v.key === 'apiVersion')?.value).toBe('v2')
    expect(resolved.find((v) => v.key === 'baseUrl')?.value).toBe('https://api.example.com')
  })

  it('returns empty list when collection id is missing', () => {
    expect(resolveCollectionVariables(null, collections)).toEqual([])
  })
})
