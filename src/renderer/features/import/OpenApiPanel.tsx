import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Collapse,
  Chip
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import { useCallback, useEffect, useState } from 'react'
import type { OpenApiPathItem, OpenApiSpecModel } from '@shared/types'
import { useAppStore } from '../../stores/appStore'

export default function OpenApiPanel() {
  const openapiSpecs = useAppStore((s) => s.openapiSpecs)
  const loadOpenApiSpecs = useAppStore((s) => s.loadOpenApiSpecs)
  const loadCollections = useAppStore((s) => s.loadCollections)
  const loadRequests = useAppStore((s) => s.loadRequests)
  const selectRequest = useAppStore((s) => s.selectRequest)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [pathsBySpec, setPathsBySpec] = useState<Record<string, OpenApiPathItem[]>>({})

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
    setPathsBySpec((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const toggleSpec = useCallback(async (spec: OpenApiSpecModel) => {
    const isOpen = expanded[spec.id] ?? false
    setExpanded((prev) => ({ ...prev, [spec.id]: !isOpen }))
    if (!isOpen && !pathsBySpec[spec.id]) {
      const paths = await window.fluxAPI.openapi.getPaths(spec.id)
      setPathsBySpec((prev) => ({ ...prev, [spec.id]: paths }))
    }
  }, [expanded, pathsBySpec])

  const createRequest = async (specId: string, item: OpenApiPathItem) => {
    const req = await window.fluxAPI.openapi.generateRequest(specId, item.path, item.method)
    await loadRequests()
    await selectRequest(req)
  }

  useEffect(() => {
    void loadOpenApiSpecs()
  }, [loadOpenApiSpecs])

  return (
    <Box>
      <Button size="small" startIcon={<UploadFileIcon />} onClick={() => void importSpec()} sx={{ mb: 1 }}>
        Import OpenAPI / Swagger
      </Button>
      <List dense disablePadding>
        {openapiSpecs.map((spec) => {
          const isOpen = expanded[spec.id] ?? false
          const paths = pathsBySpec[spec.id] || []
          return (
            <Box key={spec.id}>
              <ListItemButton sx={{ py: 0.5 }} onClick={() => void toggleSpec(spec)}>
                {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                <ListItemText
                  primary={spec.title || spec.name}
                  secondary={`${spec.format} v${spec.version} · ${paths.length || '…'} endpoints`}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    void deleteSpec(spec.id)
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
              <Collapse in={isOpen}>
                {paths.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 4, py: 1, display: 'block' }}>
                    No paths found
                  </Typography>
                ) : (
                  paths.map((item) => (
                    <ListItemButton
                      key={`${item.method}-${item.path}`}
                      sx={{ pl: 4, py: 0.35 }}
                      onClick={() => void createRequest(spec.id, item)}
                    >
                      <Chip
                        label={item.method}
                        size="small"
                        sx={{ height: 18, fontSize: 9, fontWeight: 700, mr: 1, minWidth: 44 }}
                      />
                      <ListItemText
                        primary={item.path}
                        secondary={item.summary}
                        primaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                      <AddIcon sx={{ fontSize: 16, opacity: 0.5 }} />
                    </ListItemButton>
                  ))
                )}
              </Collapse>
            </Box>
          )
        })}
        {openapiSpecs.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No specs imported
          </Typography>
        )}
      </List>
    </Box>
  )
}
