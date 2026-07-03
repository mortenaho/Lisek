import WebSocket from 'ws'
import type { KeyValue, WsMessage } from '../../../shared/types'
import { v4 as uuidv4 } from 'uuid'

interface WsConnection {
  ws: WebSocket
  messages: WsMessage[]
}

const connections = new Map<string, WsConnection>()

export function connectWebSocket(
  url: string,
  headers: KeyValue[],
  onMessage: (connectionId: string, message: WsMessage) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = uuidv4()
    const headerMap: Record<string, string> = {}
    for (const h of headers) {
      if (h.enabled && h.key) headerMap[h.key] = h.value
    }

    const ws = new WebSocket(url, { headers: headerMap })
    const conn: WsConnection = { ws, messages: [] }
    connections.set(id, conn)

    ws.on('open', () => resolve(id))
    ws.on('error', (err) => {
      connections.delete(id)
      reject(err)
    })
    ws.on('message', (data) => {
      const msg: WsMessage = {
        id: uuidv4(),
        direction: 'received',
        data: data.toString(),
        timestamp: Date.now()
      }
      conn.messages.push(msg)
      onMessage(id, msg)
    })
    ws.on('close', () => connections.delete(id))
  })
}

export function sendWebSocketMessage(connectionId: string, data: string): WsMessage {
  const conn = connections.get(connectionId)
  if (!conn) throw new Error('WebSocket connection not found')
  conn.ws.send(data)
  const msg: WsMessage = {
    id: uuidv4(),
    direction: 'sent',
    data,
    timestamp: Date.now()
  }
  conn.messages.push(msg)
  return msg
}

export function disconnectWebSocket(connectionId: string): void {
  const conn = connections.get(connectionId)
  if (conn) {
    conn.ws.close()
    connections.delete(connectionId)
  }
}
