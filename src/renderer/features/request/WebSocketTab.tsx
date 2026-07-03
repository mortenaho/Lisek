import { Box, Button, TextField, List, ListItem, Typography } from '@mui/material'
import { memo, useEffect, useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useRequestEditorActions } from '../../contexts/RequestEditorContext'
import type { WsMessage } from '@shared/types'

const WsMessageList = memo(function WsMessageList({ messages }: { messages: WsMessage[] }) {
  return (
    <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'action.hover', borderRadius: 1 }}>
      {messages.map((m) => (
        <ListItem key={m.id} sx={{ py: 0.25 }}>
          <Typography variant="caption" sx={{ color: m.direction === 'sent' ? 'primary.main' : 'success.main' }}>
            [{m.direction}] {m.data}
          </Typography>
        </ListItem>
      ))}
    </List>
  )
})

export default function WebSocketTab() {
  const { flush } = useRequestEditorActions()
  const wsConnectionId = useAppStore((s) => s.wsConnectionId)
  const wsMessages = useAppStore((s) => s.wsMessages)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsub = window.fluxAPI.ws.onMessage((_, msg) => {
      useAppStore.setState((s) => ({ wsMessages: [...s.wsMessages, msg] }))
    })
    return unsub
  }, [])

  const connect = async () => {
    flush()
    const req = useAppStore.getState().activeRequest
    if (!req) return
    const id = await window.fluxAPI.ws.connect(req.wsUrl || req.url, req.headers)
    useAppStore.setState({ wsConnectionId: id, wsMessages: [] })
  }

  const send = async () => {
    if (wsConnectionId && message) {
      await window.fluxAPI.ws.send(wsConnectionId, message)
      useAppStore.setState((s) => ({
        wsMessages: [
          ...s.wsMessages,
          { id: Date.now().toString(), direction: 'sent' as const, data: message, timestamp: Date.now() }
        ]
      }))
      setMessage('')
    }
  }

  const disconnect = async () => {
    if (wsConnectionId) {
      await window.fluxAPI.ws.disconnect(wsConnectionId)
      useAppStore.setState({ wsConnectionId: null })
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant="contained" onClick={connect} disabled={!!wsConnectionId}>
          Connect
        </Button>
        <Button onClick={disconnect} disabled={!wsConnectionId}>
          Disconnect
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Message to send"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button variant="contained" onClick={send} disabled={!wsConnectionId}>
          Send
        </Button>
      </Box>
      <Typography variant="subtitle2">Messages</Typography>
      <WsMessageList messages={wsMessages} />
    </Box>
  )
}
