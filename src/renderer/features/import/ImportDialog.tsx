import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Box
} from '@mui/material'
import { useAppStore } from '../../stores/appStore'

export default function ImportDialog() {
  const open = useAppStore((s) => s.importDialogOpen)
  const importType = useAppStore((s) => s.importType)
  const setImportDialog = useAppStore((s) => s.setImportDialog)
  const curlPaste = useAppStore((s) => s.curlPaste)
  const setCurlPaste = useAppStore((s) => s.setCurlPaste)
  const loadCollections = useAppStore((s) => s.loadCollections)
  const loadRequests = useAppStore((s) => s.loadRequests)
  const loadOpenApiSpecs = useAppStore((s) => s.loadOpenApiSpecs)
  const selectRequest = useAppStore((s) => s.selectRequest)

  const handleClose = () => setImportDialog(false)

  const importCollection = async () => {
    const path = await window.fluxAPI.dialog.openFile([{ name: 'JSON Collection', extensions: ['json'] }])
    if (path) {
      await window.fluxAPI.import.postman(path)
      await loadCollections()
      await loadRequests()
      handleClose()
    }
  }

  const importOpenApi = async () => {
    const path = await window.fluxAPI.dialog.openFile([
      { name: 'OpenAPI', extensions: ['json', 'yaml', 'yml'] }
    ])
    if (path) {
      await window.fluxAPI.import.openapi(path)
      await loadCollections()
      await loadRequests()
      await loadOpenApiSpecs()
      handleClose()
    }
  }

  const importCurl = async () => {
    if (curlPaste.trim()) {
      const req = await window.fluxAPI.import.curl(curlPaste)
      await selectRequest(req)
      await loadRequests()
      handleClose()
    }
  }

  if (importType === 'curl') {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Import cURL</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            minRows={6}
            fullWidth
            placeholder="Paste cURL command here..."
            value={curlPaste}
            onChange={(e) => setCurlPaste(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={importCurl}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Import</DialogTitle>
      <DialogContent sx={{ minWidth: 320 }}>
        <List>
          <ListItemButton onClick={importCollection}>
            <ListItemText primary="Collection v2.1 (JSON)" secondary="Import API collection export" />
          </ListItemButton>
          <ListItemButton onClick={importOpenApi}>
            <ListItemText primary="OpenAPI / Swagger" secondary="Import .json, .yaml, .yml" />
          </ListItemButton>
          <ListItemButton onClick={() => setImportDialog(true, 'curl')}>
            <ListItemText primary="cURL" secondary="Paste cURL command" />
          </ListItemButton>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
