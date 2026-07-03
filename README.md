# FluxAPI

Offline desktop API client built with Electron, React, MUI, and SQLite.

## Features

- HTTP requests (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Collections & Environments with `{{variable}}` substitution
- Auth: Bearer, Basic, API Key
- History with re-send
- Import/Export: Collection v2.1 JSON, OpenAPI/Swagger (JSON/YAML), cURL
- Pre-request scripts & Tests (`pm.*` API)
- WebSocket, GraphQL, gRPC (proto import, unary/streaming)
- Fully offline — bundled Roboto fonts & MUI icons (no CDN)

## Development

```bash
npm install
npm run dev
```

## Build Windows Installer

```bash
npm run build
npm run dist
```

Output: `release/FluxAPI Setup.exe`

## Data Storage

SQLite database at `%APPDATA%/FluxAPI/fluxapi.db` using sql.js (pure JS, no native build).

## Project Structure

```
src/
  main/          Electron main process + services + SQLite
  preload/       Secure IPC bridge
  renderer/      React + MUI UI
shared/          Shared TypeScript types
```
# fluxapi
