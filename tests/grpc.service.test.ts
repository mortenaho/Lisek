import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getProtoServices, importProtoFile, deleteProtoFile } from '../src/main/services/grpc.service'
import { initDatabase } from '../src/main/db'

const fixtureDir = join(process.cwd(), 'tests', 'fixtures')
const protoPath = join(fixtureDir, 'user.proto')

const USER_PROTO = `syntax = "proto3";

option csharp_namespace = "GrpcDemo";

package user;

service UserService {
  rpc GetUser (GetUserRequest) returns (UserResponse);
  rpc CreateUser (CreateUserRequest) returns (CreateUserResponse);
  rpc DeleteUser (DeleteUserRequest) returns (DeleteUserResponse);
}

message GetUserRequest {
  int32 id = 1;
}

message UserResponse {
  int32 id = 1;
  string firstName = 2;
  string lastName = 3;
  string email = 4;
}

message CreateUserRequest {
  string firstName = 1;
  string lastName = 2;
  string email = 3;
}

message CreateUserResponse {
  int32 id = 1;
  bool success = 2;
}

message DeleteUserRequest {
  int32 id = 1;
}

message DeleteUserResponse {
  bool success = 1;
  string message = 2;
}
`

beforeAll(() => {
  mkdirSync(fixtureDir, { recursive: true })
  writeFileSync(protoPath, USER_PROTO, 'utf-8')
  initDatabase()
})

describe('gRPC proto import', () => {
  it('extractServices — finds UserService methods from package user', () => {
    const { protoId, services } = importProtoFile(protoPath)

    expect(services).toHaveLength(1)
    expect(services[0].name).toBe('user.UserService')
    expect(services[0].methods.map((m) => m.name)).toEqual(['GetUser', 'CreateUser', 'DeleteUser'])

    const reloaded = getProtoServices(protoId)
    expect(reloaded[0].methods).toHaveLength(3)

    deleteProtoFile(protoId)
  })
})
