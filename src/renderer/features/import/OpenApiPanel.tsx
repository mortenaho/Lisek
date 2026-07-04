import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Collapse,
  Chip,
  Tooltip
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined'
import { useCallback, useEffect, useState } from 'react'
import type { OpenApiPathItem, OpenApiSpecModel } from '@shared/types'
import { useAppStore } from '../../stores/appStore'

const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7'
}

function shortPath(path: string) {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  if (parts.length <= 3) return normalized
  return `…/${parts.slice(-2).join('/')}`
}

function formatImportedAt(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatLabel(spec: OpenApiSpecModel) {
  return spec.format === 'openapi3' ? 'OpenAPI 3' : 'Swagger 2'
}

export default function OpenApiPanel() {
  const openapiSpecs = useAppStore((s) => s.openapiSpecs)
  const loadOpenApiSpecs = useAppStore((s) => s.loadOpenApiSpecs)
  const loadCollections = useAppStore((s) => s.loadCollections)
  const loadRequests = useAppStore((s) => s.loadRequests)
  const selectRequest = useAppStore((s) => s.selectRequest)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [pathsBySpec, setPathsBySpec] = useState<Record<string, OpenApiPathItem[]>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  useEffect(() => {
    void loadOpenApiSpecs()
  }, [loadOpenApiSpecs])

  const importSpec = async () => {
    const path = await window.fluxAPI.dialog.openFile([
      { name: 'OpenAPI/Swagger', extensions: ['json', 'yaml', 'yml'] }
    ])
    if (path) {
      await window.fluxAPI.import.openapi(path)
      await loadOpenApiSpecs()
      await loadCollections()
      await loadRequests()
    }
  }

  const deleteSpec = async (id: string) => {
    await window.fluxAPI.openapi.delete(id)
    await loadOpenApiSpecs()
    setExpanded((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setPathsBySpec((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const toggleSpec = useCallback(
    async (spec: OpenApiSpecModel) => {
      const isOpen = expanded[spec.id] ?? false
      setExpanded((prev) => ({ ...prev, [spec.id]: !isOpen }))

      if (!isOpen && !pathsBySpec[spec.id]) {
        setLoadingId(spec.id)
        try {
          const paths = await window.fluxAPI.openapi.getPaths(spec.id)
          setPathsBySpec((prev) => ({ ...prev, [spec.id]: paths }))
        } catch {
          setPathsBySpec((prev) => ({ ...prev, [spec.id]: [] }))
        } finally {
          setLoadingId(null)
        }
      }
    },
    [expanded, pathsBySpec]
  )

  const createRequest = async (specId: string, item: OpenApiPathItem) => {
    const req = await window.fluxAPI.openapi.generateRequest(specId, item.path, item.method)
    await loadRequests()
    await selectRequest(req)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {openapiSpecs.length > 0
            ? `${openapiSpecs.length} spec${openapiSpecs.length > 1 ? 's' : ''}`
            : 'API specifications'}
        </Typography>
      </Box>

      <Button
        size="small"
        variant="outlined"
        fullWidth
        startIcon={<UploadFileIcon />}
        onClick={() => void importSpec()}
        sx={{ mb: 1.5 }}
      >
        Import OpenAPI / Swagger
      </Button>

      {openapiSpecs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
          No specs imported yet
        </Typography>
      ) : (
        <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {openapiSpecs.map((spec) => {
            const isOpen = expanded[spec.id] ?? false
            const paths = pathsBySpec[spec.id]
            const isLoading = loadingId === spec.id
            const endpointCount = paths?.length

            return (
              <Box
                key={spec.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <ListItemButton
                  sx={{
                    py: 0.75,
                    pr: 0.5,
                    '&:hover .spec-delete': { opacity: 1 }
                  }}
                  onClick={() => void toggleSpec(spec)}
                >
                  {isOpen ? (
                    <ExpandLess fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                  ) : (
                    <ExpandMore fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                  )}
                  <ApiOutlinedIcon sx={{ fontSize: 18, mr: 1, opacity: 0.6, flexShrink: 0 }} />
                  <ListItemText
                    primary={spec.title || spec.name}
                    secondary={
                      <Tooltip title={spec.filePath} placement="bottom-start">
                        <span>
                          {formatLabel(spec)} v{spec.version} · {shortPath(spec.filePath)} ·{' '}
                          {formatImportedAt(spec.importedAt)}
                        </span>
                      </Tooltip>
                    }
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      noWrap: true,
                      sx: { opacity: 0.8 }
                    }}
                  />
                  {endpointCount !== undefined && (
                    <Chip
                      label={`${endpointCount} ep`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 10, mr: 0.5, flexShrink: 0 }}
                    />
                  )}
                  <IconButton
                    className="spec-delete"
                    size="small"
                    sx={{ opacity: 0.35, flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteSpec(spec.id)
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </ListItemButton>

                <Collapse in={isOpen}>
                  <Box
                    sx={{
                      borderTop: 1,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      maxHeight: 280,
                      overflow: 'auto'
                    }}
                  >
                    {isLoading && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', py: 1, px: 1.5 }}
                      >
                        Loading endpoints…
                      </Typography>
                    )}
                    {!isLoading && paths?.length === 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', py: 1, px: 1.5 }}
                      >
                        No paths found
                      </Typography>
                    )}
                    {paths?.map((item) => (
                      <ListItemButton
                        key={`${item.method}-${item.path}`}
                        sx={{
                          py: 0.5,
                          px: 1.5,
                          borderBottom: 1,
                          borderColor: 'divider',
                          '&:last-of-type': { borderBottom: 0 },
                          '&:hover .endpoint-add': { opacity: 1 }
                        }}
                        onClick={() => void createRequest(spec.id, item)}
                      >
                        <Chip
                          label={item.method}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            mr: 1,
                            minWidth: 48,
                            flexShrink: 0,
                            bgcolor: METHOD_COLORS[item.method] || '#999',
                            color: '#fff',
                            '& .MuiChip-label': { px: 0.75 }
                          }}
                        />
                        <ListItemText
                          primary={item.path}
                          secondary={item.summary}
                          primaryTypographyProps={{
                            variant: 'caption',
                            fontFamily: 'Consolas, monospace',
                            noWrap: true
                          }}
                          secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                        />
                        <Tooltip title="Create request">
                          <AddIcon className="endpoint-add" sx={{ fontSize: 16, opacity: 0.35, flexShrink: 0 }} />
                        </Tooltip>
                      </ListItemButton>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
        </List>
      )}
    </Box>
  )
}
