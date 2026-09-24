import { useEffect, useState, useCallback, memo } from 'react'
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import CodeEditor from '../../components/CodeEditor'
import { useAppStore } from '../../stores/appStore'
import { useRequestEditorActions, useRequestField } from '../../contexts/RequestEditorContext'
import KeyValueEditor from '../../components/KeyValueEditor'
import type { GrpcServiceInfo, KeyValue } from '@shared/types'

const GrpcMessageEditor = memo(function GrpcMessageEditor() {
  const { patch } = useRequestEditorActions()
  const requestId = useRequestField('id')
  const grpcMessage = useRequestField('grpcMessage')
  const onChange = useCallback((next: string) => patch({ grpcMessage: next }), [patch])

  return (
    <CodeEditor
      editorKey={`${requestId}-grpc-msg`}
      height="150px"
      language="json"
      value={grpcMessage}
      onChange={onChange}
    />
  )
})

const GrpcMetadataEditor = memo(function GrpcMetadataEditor() {
  const { patch } = useRequestEditorActions()
  const grpcMetadata = useRequestField('grpcMetadata')
  const onChange = useCallback((next: KeyValue[]) => patch({ grpcMetadata: next }), [patch])

  return (
    <KeyValueEditor
      items={grpcMetadata}
      onChange={onChange}
      keyLabel="Metadata Key"
      valueLabel="Value"
    />
  )
})

export default function GrpcTab() {
  const { patch } = useRequestEditorActions()
  const grpcProtoId = useRequestField('grpcProtoId')
  const grpcService = useRequestField('grpcService')
  const grpcMethod = useRequestField('grpcMethod')
  const protoFiles = useAppStore((s) => s.protoFiles)
  const [services, setServices] = useState<GrpcServiceInfo[]>([])

  useEffect(() => {
    const load = async () => {
      if (!grpcProtoId) return
      const next = await window.lisek.grpc.getServices(grpcProtoId)
      setServices(next)
    }
    void load()
  }, [grpcProtoId])

  const loadServices = async (protoId: string) => {
    patch({ grpcProtoId: protoId, grpcService: '', grpcMethod: '' })
    const next = await window.lisek.grpc.getServices(protoId)
    setServices(next)
  }

  const selectedService = services.find((s) => s.name === grpcService)

  return (
    <Box>
      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel>Proto File</InputLabel>
        <Select
          value={grpcProtoId || ''}
          label="Proto File"
          onChange={(e) => void loadServices(e.target.value)}
        >
          {protoFiles.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel>Service</InputLabel>
        <Select
          value={grpcService}
          label="Service"
          onChange={(e) => patch({ grpcService: e.target.value, grpcMethod: '' })}
        >
          {services.map((s) => (
            <MenuItem key={s.name} value={s.name}>
              {s.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel>Method</InputLabel>
        <Select
          value={grpcMethod}
          label="Method"
          onChange={(e) => {
            const method = selectedService?.methods.find((m) => m.name === e.target.value)
            patch({
              grpcMethod: e.target.value,
              grpcCallType: method?.callType || 'unary'
            })
          }}
        >
          {selectedService?.methods.map((m) => (
            <MenuItem key={m.name} value={m.name}>
              {m.name} ({m.callType})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <GrpcMetadataEditor />
      <GrpcMessageEditor />
    </Box>
  )
}
