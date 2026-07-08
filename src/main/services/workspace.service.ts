import { readFileSync, writeFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { runQuery } from '../db'
import type { WorkspaceBackup } from '../../../shared/types'
import {
  listCollections,
  listRequests,
  listEnvironments,
  saveRequest,
  createCollection,
  updateCollection,
  saveEnvironment,
  setActiveEnvironment
} from './repository'
import { listOpenApiSpecs } from './openapi.service'
import { listProtoFiles } from './grpc.service'

export function exportWorkspace(filePath: string): void {
  const collections = listCollections()
  const requests = listRequests()
  const environments = listEnvironments()
  const openapiSpecs = listOpenApiSpecs()
  const protoRows = listProtoFiles()

  const backup: WorkspaceBackup = {
    version: 1,
    exportedAt: Date.now(),
    collections,
    requests,
    environments,
    openapiSpecs,
    protoFiles: protoRows.map((p) => ({
      id: p.id,
      name: p.name,
      filePath: p.file_path,
      content: p.content,
      importedAt: p.imported_at
    }))
  }

  writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8')
}

function validateBackup(data: unknown): WorkspaceBackup {
  if (!data || typeof data !== 'object') throw new Error('Invalid workspace backup')
  const backup = data as Partial<WorkspaceBackup>
  if (backup.version !== 1) throw new Error('Unsupported workspace backup version')
  if (!Array.isArray(backup.collections) || !Array.isArray(backup.requests)) {
    throw new Error('Invalid workspace backup structure')
  }
  return backup as WorkspaceBackup
}

export function importWorkspace(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8')
  const backup = validateBackup(JSON.parse(content))

  runQuery('DELETE FROM history')
  runQuery('DELETE FROM requests')
  runQuery('DELETE FROM collections')
  runQuery('DELETE FROM environments')
  runQuery('DELETE FROM openapi_specs')
  runQuery('DELETE FROM proto_files')

  const collectionIdMap = new Map<string, string>()
  for (const col of backup.collections) {
    const newId = uuidv4()
    collectionIdMap.set(col.id, newId)
    createCollection({
      id: newId,
      name: col.name,
      parentId: null,
      sortOrder: col.sortOrder,
      pinned: col.pinned,
      variables: col.variables,
      description: col.description
    })
  }

  for (const col of backup.collections) {
    const newId = collectionIdMap.get(col.id)!
    const parentId = col.parentId ? collectionIdMap.get(col.parentId) ?? null : null
    updateCollection(newId, { parentId, sortOrder: col.sortOrder, pinned: col.pinned, description: col.description })
  }

  for (const req of backup.requests) {
    saveRequest({
      ...req,
      id: uuidv4(),
      collectionId: req.collectionId ? collectionIdMap.get(req.collectionId) ?? null : null,
      lastResponse: null,
      lastTestResults: []
    })
  }

  let activeEnvId: string | null = null
  for (const env of backup.environments) {
    const saved = saveEnvironment({
      name: env.name,
      isActive: env.isActive,
      variables: env.variables
    })
    if (env.isActive) activeEnvId = saved.id
  }
  setActiveEnvironment(activeEnvId)

  for (const spec of backup.openapiSpecs || []) {
    runQuery(
      'INSERT INTO openapi_specs (id, name, file_path, format, content, title, version, servers_json, imported_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        uuidv4(),
        spec.name,
        spec.filePath,
        spec.format,
        spec.content,
        spec.title,
        spec.version,
        JSON.stringify(spec.servers || []),
        spec.importedAt
      ]
    )
  }

  for (const proto of backup.protoFiles || []) {
    runQuery('INSERT INTO proto_files (id, name, file_path, content, imported_at) VALUES (?,?,?,?,?)', [
      uuidv4(),
      proto.name,
      proto.filePath,
      proto.content,
      proto.importedAt
    ])
  }
}
