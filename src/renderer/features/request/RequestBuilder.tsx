import {
  Box,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SendIcon from '@mui/icons-material/Send'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import { memo, useCallback, useEffect, useState } from 'react'
import CodeEditor from '../../components/CodeEditor'
import { useAppStore } from '../../stores/appStore'
import { RequestEditorProvider, useRequestEditor } from '../../contexts/RequestEditorContext'
import KeyValueEditor from '../../components/KeyValueEditor'
import AuthTab from './AuthTab'
import WebSocketTab from './WebSocketTab'
import GraphQLTab from './GraphQLTab'
import GrpcTab from './GrpcTab'
import ScriptsTab from './ScriptsTab'
import ConfirmDialog from '../../components/ConfirmDialog'
import VariableInput from '../../components/VariableInput'
import type { HttpMethod, KeyValue, Protocol } from '@shared/types'

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7'
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const PROTOCOLS: Protocol[] = ['http', 'graphql', 'websocket', 'grpc']
const EMPTY_VARS: KeyValue[] = []

const SendButton = memo(function SendButton({
  onSend,
  onCancel
}: {
  onSend: () => void
  onCancel: () => void
}) {
  const loading = useAppStore((s) => s.loading)

  if (loading) {
    return (
      <Button variant="outlined" color="warning" onClick={onCancel}>
        Cancel
      </Button>
    )
  }

  return (
    <Button variant="contained" color="primary" startIcon={<SendIcon />} onClick={onSend}>
      Send
    </Button>
  )
})

function RequestBuilderForm({
  collectionVariables,
  onDelete
}: {
  collectionVariables: KeyValue[]
  onDelete: () => void
}) {
  const { request, patch, flush } = useRequestEditor()
  const sendRequest = useAppStore((s) => s.sendRequest)
  const snippetOpen = useAppStore((s) => s.snippetOpen)
  const [tab, setTab] = useState(0)
  const [jsonFormatError, setJsonFormatError] = useState<string | null>(null)

  useEffect(() => {
    if (snippetOpen) flush()
  }, [snippetOpen, flush])

  useEffect(() => {
    if (request.bodyType !== 'none') setTab(2)
  }, [request.id, request.bodyType])

  const handleSend = useCallback(async () => {
    flush()
    await sendRequest()
  }, [flush, sendRequest])

  const handleCancel = useCallback(async () => {
    const id = useAppStore.getState().activeRequest?.id
    if (id) await window.fluxAPI.request.cancel(id)
    useAppStore.setState({ loading: false })
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') void handleSend()
    },
    [handleSend]
  )

  const patchUrl = useCallback((url: string) => patch({ url }), [patch])
  const patchParams = useCallback((params: KeyValue[]) => patch({ params }), [patch])
  const patchHeaders = useCallback((headers: KeyValue[]) => patch({ headers }), [patch])
  const patchFormData = useCallback((formData: KeyValue[]) => patch({ formData }), [patch])
  const patchUrlEncoded = useCallback((urlEncoded: KeyValue[]) => patch({ urlEncoded }), [patch])
  const patchBodyRaw = useCallback((bodyRaw: string) => patch({ bodyRaw }), [patch])

  const formatBodyJson = useCallback(() => {
    const raw = request.bodyRaw.trim()
    if (!raw) {
      setJsonFormatError('Body is empty')
      return
    }
    try {
      const parsed = JSON.parse(raw)
      patch({ bodyRaw: JSON.stringify(parsed, null, 2) })
      setJsonFormatError(null)
    } catch {
      setJsonFormatError('Invalid JSON — cannot format')
    }
  }, [request.bodyRaw, patch])

  const isJsonBody = request.bodyRawContentType.toLowerCase().includes('json')

  return (
    <Box sx={{ p: 2 }} onKeyDown={handleKeyDown}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Protocol</InputLabel>
          <Select
            value={request.protocol}
            label="Protocol"
            onChange={(e) => patch({ protocol: e.target.value as Protocol })}
          >
            {PROTOCOLS.map((p) => (
              <MenuItem key={p} value={p}>
                {p.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {request.protocol === 'http' || request.protocol === 'graphql' ? (
          <>
            <Select
              size="small"
              value={request.method}
              onChange={(e) => patch({ method: e.target.value as HttpMethod })}
              sx={{
                minWidth: 100,
                bgcolor: METHOD_COLORS[request.method],
                color: '#fff',
                fontWeight: 700,
                '.MuiOutlinedInput-notchedOutline': { border: 'none' },
                '.MuiSvgIcon-root': { color: '#fff' }
              }}
            >
              {METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
            <VariableInput
              value={request.url}
              onChange={patchUrl}
              placeholder="https://api.example.com/endpoint or {{baseUrl}}/path"
              collectionVariables={collectionVariables}
            />
          </>
        ) : request.protocol === 'websocket' ? (
          <TextField
            size="small"
            fullWidth
            placeholder="ws://localhost:8080"
            value={request.wsUrl}
            onChange={(e) => patch({ wsUrl: e.target.value })}
          />
        ) : (
          <TextField
            size="small"
            fullWidth
            placeholder="localhost:50051"
            value={request.grpcTarget}
            onChange={(e) => patch({ grpcTarget: e.target.value })}
          />
        )}
        <SendButton onSend={handleSend} onCancel={() => void handleCancel()} />
        {request.id && (
          <Tooltip title="Delete request">
            <IconButton color="error" onClick={onDelete}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        <Tab label="Params" />
        <Tab label="Headers" />
        <Tab label="Body" />
        <Tab label="Auth" />
        <Tab label="Scripts" />
        {request.protocol === 'graphql' && <Tab label="GraphQL" />}
        {request.protocol === 'websocket' && <Tab label="WebSocket" />}
        {request.protocol === 'grpc' && <Tab label="gRPC" />}
      </Tabs>

      <Box sx={{ pt: 2 }}>
        {tab === 0 && (
          <KeyValueEditor items={request.params} onChange={patchParams} keyLabel="Param" />
        )}
        {tab === 1 && <KeyValueEditor items={request.headers} onChange={patchHeaders} />}
        {tab === 2 && (
          <Box>
            <FormControl size="small" sx={{ mb: 2, minWidth: 200 }}>
              <InputLabel>Body Type</InputLabel>
              <Select
                value={request.bodyType}
                label="Body Type"
                onChange={(e) => patch({ bodyType: e.target.value as typeof request.bodyType })}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="raw">Raw</MenuItem>
                <MenuItem value="form-data">Form Data</MenuItem>
                <MenuItem value="x-www-form-urlencoded">URL Encoded</MenuItem>
              </Select>
            </FormControl>
            {request.bodyType === 'raw' && (
              <>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    label="Content-Type"
                    value={request.bodyRawContentType}
                    onChange={(e) => patch({ bodyRawContentType: e.target.value })}
                    sx={{ width: 300 }}
                  />
                  <Tooltip title="Format JSON (2-space indent)">
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoFixHighIcon />}
                        onClick={formatBodyJson}
                        disabled={!request.bodyRaw.trim()}
                      >
                        Beautify JSON
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
                <CodeEditor
                  editorKey={`${request.id}-body`}
                  height="200px"
                  language={isJsonBody ? 'json' : 'plaintext'}
                  value={request.bodyRaw}
                  onChange={patchBodyRaw}
                />
              </>
            )}
            {request.bodyType === 'form-data' && (
              <KeyValueEditor items={request.formData} onChange={patchFormData} allowFiles />
            )}
            {request.bodyType === 'x-www-form-urlencoded' && (
              <KeyValueEditor items={request.urlEncoded} onChange={patchUrlEncoded} />
            )}
          </Box>
        )}
        {tab === 3 && <AuthTab />}
        {tab === 4 && <ScriptsTab />}
        {tab === 5 && request.protocol === 'graphql' && <GraphQLTab />}
        {tab === 5 && request.protocol === 'websocket' && <WebSocketTab />}
        {tab === 5 && request.protocol === 'grpc' && <GrpcTab />}
      </Box>

      <Snackbar
        open={!!jsonFormatError}
        autoHideDuration={4000}
        onClose={() => setJsonFormatError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setJsonFormatError(null)} sx={{ width: '100%' }}>
          {jsonFormatError}
        </Alert>
      </Snackbar>
    </Box>
  )
}

function RequestBuilderShell() {
  const hasActiveRequest = useAppStore((s) => s.activeRequest !== null)
  const requestId = useAppStore((s) => s.activeRequest?.id)
  const requestCreatedAt = useAppStore((s) => s.activeRequest?.createdAt ?? 0)
  const collectionId = useAppStore((s) => s.activeRequest?.collectionId)
  const deleteRequest = useAppStore((s) => s.deleteRequest)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteName, setDeleteName] = useState('')

  const collectionVariables = useAppStore((s) => {
    if (!collectionId) return EMPTY_VARS
    return s.collections.find((c) => c.id === collectionId)?.variables ?? EMPTY_VARS
  })

  const openDeleteDialog = useCallback(() => {
    setDeleteName(useAppStore.getState().activeRequest?.name ?? '')
    setDeleteOpen(true)
  }, [])

  if (!hasActiveRequest) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Select or create a request</Typography>
      </Box>
    )
  }

  const handleDelete = async () => {
    if (requestId) await deleteRequest(requestId)
    setDeleteOpen(false)
  }

  const editorKey = requestId || `new-${requestCreatedAt}`

  return (
    <>
      <RequestEditorProvider key={editorKey} requestId={editorKey}>
        <RequestBuilderForm collectionVariables={collectionVariables} onDelete={openDeleteDialog} />
      </RequestEditorProvider>
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Request"
        message={`Delete "${deleteName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}

export default memo(RequestBuilderShell)
