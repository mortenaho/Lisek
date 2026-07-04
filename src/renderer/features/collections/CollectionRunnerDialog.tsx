import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  FormControlLabel,
  Checkbox
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useState } from 'react'
import type { CollectionModel, CollectionRunResult } from '@shared/types'

interface Props {
  open: boolean
  collection: CollectionModel | null
  onClose: () => void
}

export default function CollectionRunnerDialog({ open, collection, onClose }: Props) {
  const [running, setRunning] = useState(false)
  const [stopOnFailure, setStopOnFailure] = useState(true)
  const [results, setResults] = useState<CollectionRunResult[]>([])

  const run = async () => {
    if (!collection) return
    setRunning(true)
    setResults([])
    try {
      const outcome = await window.lisek.runner.runCollection(collection.id, stopOnFailure)
      setResults(outcome)
    } finally {
      setRunning(false)
    }
  }

  const passed = results.filter((r) => r.passed).length

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={600}>
          Run Collection — {collection?.name}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <FormControlLabel
          control={
            <Checkbox checked={stopOnFailure} onChange={(e) => setStopOnFailure(e.target.checked)} />
          }
          label="Stop on first failure"
          sx={{ mb: 1 }}
        />
        {running && <LinearProgress sx={{ mb: 2 }} />}
        {results.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {passed}/{results.length} passed
          </Typography>
        )}
        <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
          {results.map((result) => (
            <ListItem key={result.requestId} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {result.passed ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <CancelIcon color="error" fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={result.requestName}
                secondary={
                  result.error
                    ? `${result.statusCode || 'ERR'} · ${result.error}`
                    : `${result.statusCode} · ${result.durationMs} ms`
                }
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
        {results.length === 0 && !running && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Run all HTTP/GraphQL requests in this collection sequentially
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          disabled={running || !collection}
          onClick={() => void run()}
        >
          Run
        </Button>
      </DialogActions>
    </Dialog>
  )
}
