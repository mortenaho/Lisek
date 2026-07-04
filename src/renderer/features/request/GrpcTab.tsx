import { useEffect, useState, useCallback } from 'react'
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import CodeEditor from '../../components/CodeEditor'
import { useAppStore } from '../../stores/appStore'
import { useRequestEditor } from '../../contexts/RequestEditorContext'
import KeyValueEditor from '../../components/KeyValueEditor'
import type { GrpcServiceInfo, KeyValue } from '@shared/types'

export default function GrpcTab() {
  const { request, patch } = useRequestEditor()
  const protoFiles = useAppStore((s) => s.protoFiles)
  const [services, setServices] = useState<GrpcServiceInfo[]>([])

  useEffect(() => {
    const load = async () => {
      if (!request.grpcProtoId) return
      const services = await window.lisek.grpc.getServices(request.grpcProtoId)
      setServices(services)
    }
    load()
  }, [request.grpcProtoId])

  const loadServices = async (protoId: string) => {
    patch({ grpcProtoId: protoId, grpcService: '', grpcMethod: '' })
    const services = await window.lisek.grpc.getServices(protoId)
    setServices(services)
  }

  const patchMetadata = useCallback(
    (grpcMetadata: KeyValue[]) => patch({ grpcMetadata }),
    [patch]
  )
  const patchMessage = useCallback((grpcMessage: string) => patch({ grpcMessage }), [patch])

  const selectedService = services.find((s) => s.name === request.grpcService)

  return (
    <Box>
      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel>Proto File</InputLabel>
        <Select
          value={request.grpcProtoId || ''}
          label="Proto File"
          onChange={(e) => loadServices(e.target.value)}
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
          value={request.grpcService}
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
          value={request.grpcMethod}
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
      <KeyValueEditor
        items={request.grpcMetadata}
        onChange={patchMetadata}
        keyLabel="Metadata Key"
        valueLabel="Value"
      />
      <CodeEditor
        height="150px"
        language="json"
        value={request.grpcMessage}
        onChange={patchMessage}
      />
    </Box>
  )
}
