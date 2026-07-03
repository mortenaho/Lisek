import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  List,
  ListItem,
  IconButton,
  Typography,
  Divider
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import { v4 as uuidv4 } from 'uuid'
import { useEffect, useState } from 'react'
import type { CollectionModel, KeyValue } from '@shared/types'
import { useAppStore } from '../../stores/appStore'

interface Props {
  open: boolean
  collection: CollectionModel | null
  onClose: () => void
}

export default function CollectionVariablesDialog({ open, collection, onClose }: Props) {
  const loadCollections = useAppStore((s) => s.loadCollections)
  const [variables, setVariables] = useState<KeyValue[]>([])

  useEffect(() => {
    if (collection) setVariables(collection.variables.map((v) => ({ ...v })))
  }, [collection, open])

  const save = async () => {
    if (!collection) return
    await window.fluxAPI.collections.update(collection.id, { variables })
    await loadCollections()
    onClose()
  }

  const updateVar = (index: number, field: 'key' | 'value', value: string) => {
    setVariables((vars) => vars.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const addVar = () => {
    setVariables((vars) => [...vars, { id: uuidv4(), key: '', value: '', enabled: true }])
  }

  const removeVar = (index: number) => {
    setVariables((vars) => vars.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={600}>
          Collection Variables — {collection?.name}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Use {'{{variableName}}'} in requests inside this collection
        </Typography>
        <List dense disablePadding>
          {variables.map((v, i) => (
            <ListItem key={v.id} disableGutters sx={{ gap: 1, py: 0.5 }}>
              <TextField
                size="small"
                placeholder="Variable"
                value={v.key}
                onChange={(e) => updateVar(i, 'key', e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                placeholder="Value"
                value={v.value}
                onChange={(e) => updateVar(i, 'value', e.target.value)}
                sx={{ flex: 1.5 }}
              />
              <IconButton size="small" onClick={() => removeVar(i)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <Button size="small" startIcon={<AddIcon />} onClick={addVar} sx={{ mt: 1 }}>
          Add Variable
        </Button>
        {variables.length === 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              No collection variables yet
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
