import { describe, expect, it, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { initDatabase } from '../src/main/db/index'
import { listRequests } from '../src/main/services/repository'
import {
  extractOperationBody,
  importOpenApiFromContent,
  sampleFromSchema
} from '../src/main/services/openapi.service'

const testDir = mkdtempSync(join(tmpdir(), 'lisek-openapi-body-'))
initDatabase(join(testDir, 'test.db'))

afterAll(() => rmSync(testDir, { recursive: true, force: true }))

describe('sampleFromSchema', () => {
  it('builds an object from properties when no example exists', () => {
    expect(
      sampleFromSchema({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
          active: { type: 'boolean' }
        }
      })
    ).toEqual({ name: 'string', age: 0, active: true })
  })

  it('prefers schema.example over generated values', () => {
    expect(sampleFromSchema({ type: 'string', example: 'Ada' })).toBe('Ada')
  })
})

describe('extractOperationBody', () => {
  it('uses application/json example', () => {
    const result = extractOperationBody({
      requestBody: {
        content: {
          'application/json': { example: { name: 'Ada' } }
        }
      }
    })
    expect(result.bodyType).toBe('raw')
    expect(JSON.parse(result.bodyRaw)).toEqual({ name: 'Ada' })
  })

  it('uses named examples.value when example is missing', () => {
    const result = extractOperationBody({
      requestBody: {
        content: {
          'application/json': {
            examples: { create: { value: { email: 'a@b.com' } } }
          }
        }
      }
    })
    expect(JSON.parse(result.bodyRaw)).toEqual({ email: 'a@b.com' })
  })

  it('generates body from schema properties', () => {
    const result = extractOperationBody({
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                count: { type: 'integer' }
              }
            }
          }
        }
      }
    })
    expect(result.bodyType).toBe('raw')
    expect(JSON.parse(result.bodyRaw)).toEqual({ title: 'string', count: 0 })
  })

  it('supports Swagger 2 in:body parameters', () => {
    const result = extractOperationBody({
      parameters: [
        {
          name: 'body',
          in: 'body',
          schema: {
            type: 'object',
            properties: { id: { type: 'integer' } }
          }
        }
      ]
    })
    expect(JSON.parse(result.bodyRaw)).toEqual({ id: 0 })
  })
})

describe('importOpenApiFromContent body mapping', () => {
  it('fills request body from OpenAPI 3 schema without examples', async () => {
    const content = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Users API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/users': {
          post: {
            summary: 'Create user',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' }
                    }
                  }
                }
              }
            },
            responses: { '201': { description: 'Created' } }
          }
        }
      }
    })

    const imported = await importOpenApiFromContent(content, 'users.json', 'users.json', 'json')
    const create = listRequests().find((r) => r.name === 'Create user')
    expect(create).toBeTruthy()
    expect(create!.bodyType).toBe('raw')
    expect(JSON.parse(create!.bodyRaw)).toEqual({
      name: 'string',
      email: 'user@example.com'
    })
    expect(imported.count).toBe(1)
  })

  it('fills request body from Swagger 2 body parameter', async () => {
    const content = JSON.stringify({
      swagger: '2.0',
      info: { title: 'Pets', version: '1.0.0' },
      host: 'petstore.example.com',
      basePath: '/v2',
      schemes: ['https'],
      paths: {
        '/pet': {
          post: {
            summary: 'Add pet',
            parameters: [
              {
                name: 'body',
                in: 'body',
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    status: { type: 'string', enum: ['available', 'pending'] }
                  }
                }
              }
            ],
            responses: { '200': { description: 'OK' } }
          }
        }
      }
    })

    await importOpenApiFromContent(content, 'pets.json', 'pets.json', 'json')
    const addPet = listRequests().find((r) => r.name === 'Add pet')
    expect(addPet).toBeTruthy()
    expect(JSON.parse(addPet!.bodyRaw)).toEqual({ name: 'string', status: 'available' })
  })
})
