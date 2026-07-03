import type { KeyValue, RequestModel } from '@shared/types'

export function kv(key: string, value: string, enabled = true): KeyValue {
  return { id: key, key, value, enabled }
}

export function sampleRequest(overrides: Partial<RequestModel> = {}): RequestModel {
  return {
    id: 'req-1',
    collectionId: null,
    name: 'Test Request',
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: [kv('Content-Type', 'application/json')],
    params: [kv('page', '1')],
    bodyType: 'raw',
    bodyRaw: '{"name":"test"}',
    bodyRawContentType: 'application/json',
    formData: [],
    urlEncoded: [],
    authType: 'none',
    auth: {},
    preRequestScript: '',
    testScript: '',
    protocol: 'http',
    graphqlQuery: '',
    graphqlVariables: '{}',
    wsUrl: '',
    wsMessages: [],
    grpcTarget: '',
    grpcService: '',
    grpcMethod: '',
    grpcCallType: 'unary',
    grpcProtoId: null,
    grpcMetadata: [],
    grpcMessage: '{}',
    sortOrder: 0,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastResponse: null,
    lastTestResults: [],
    ...overrides
  }
}
