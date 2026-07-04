import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

export default function CurlSnippetDialog() {
  const open = useAppStore((s) => s.snippetOpen)
  const setSnippetOpen = useAppStore((s) => s.setSnippetOpen)
  const requestId = useAppStore((s) => s.activeRequest?.id)
  const [snippet, setSnippet] = useState('')

  useEffect(() => {
    if (!open) return
    const req = useAppStore.getState().activeRequest
    if (!req) return

    if (req.id) {
      window.lisek.export.curl(req.id).then(setSnippet).catch(() => {
        setSnippet(`curl -X ${req.method} '${req.url}'`)
      })
    } else {
      setSnippet(`curl -X ${req.method} '${req.url}'`)
    }
  }, [open, requestId])

  const copy = async () => {
    await window.lisek.clipboard.writeText(snippet)
  }

  return (
    <Dialog open={open} onClose={() => setSnippetOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>cURL Snippet</DialogTitle>
      <DialogContent>
        <Box
          component="pre"
          sx={{
            bgcolor: 'action.hover',
            p: 2,
            borderRadius: 1,
            fontSize: 13,
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
          }}
        >
          {snippet}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSnippetOpen(false)}>Close</Button>
        <Button variant="contained" onClick={copy}>
          Copy
        </Button>
      </DialogActions>
    </Dialog>
  )
}
