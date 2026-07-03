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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Divider,
  Chip
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import { v4 as uuidv4 } from 'uuid'
import { useState } from 'react'
import type { KeyValue } from '@shared/types'
import { useAppStore } from '../../stores/appStore'
import ConfirmDialog from '../../components/ConfirmDialog'

interface Props {
  open: boolean
  onClose: () => void
}

export default function EnvironmentsDialog({ open, onClose }: Props) {
  const environments = useAppStore((s) => s.environments)
  const loadEnvironments = useAppStore((s) => s.loadEnvironments)
  const activeEnv = environments.find((e) => e.isActive)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const createEnv = async () => {
    await window.fluxAPI.environments.save({ name: 'New Environment', variables: [], isActive: false })
    await loadEnvironments()
  }

  const setActive = async (id: string) => {
    await window.fluxAPI.environments.setActive(id)
    await loadEnvironments()
  }

  const clearActive = async () => {
    await window.fluxAPI.environments.setActive(null)
    await loadEnvironments()
  }

  const saveEnvName = async () => {
    if (!activeEnv || !nameDraft.trim()) {
      setEditingName(false)
      return
    }
    await window.fluxAPI.environments.save({ ...activeEnv, name: nameDraft.trim() })
    await loadEnvironments()
    setEditingName(false)
  }

  const deleteEnv = async () => {
    if (!deleteId) return
    await window.fluxAPI.environments.delete(deleteId)
    await loadEnvironments()
    setDeleteId(null)
  }

  const updateVar = async (index: number, field: 'key' | 'value', value: string) => {
    if (!activeEnv) return
    const vars = [...activeEnv.variables]
    vars[index] = { ...vars[index], [field]: value }
    await window.fluxAPI.environments.save({ ...activeEnv, variables: vars })
    await loadEnvironments()
  }

  const addVar = async () => {
    if (!activeEnv) return
    const vars = [...activeEnv.variables, { id: uuidv4(), key: '', value: '', enabled: true }]
    await window.fluxAPI.environments.save({ ...activeEnv, variables: vars })
    await loadEnvironments()
  }

  const removeVar = async (index: number) => {
    if (!activeEnv) return
    const vars = activeEnv.variables.filter((_: KeyValue, i: number) => i !== index)
    await window.fluxAPI.environments.save({ ...activeEnv, variables: vars })
    await loadEnvironments()
  }

  const startRename = () => {
    if (!activeEnv) return
    setNameDraft(activeEnv.name)
    setEditingName(true)
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Environments
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Select environment</InputLabel>
              <Select
                value={activeEnv?.id || ''}
                label="Select environment"
                onChange={(e) => {
                  const v = e.target.value
                  if (v) setActive(v)
                  else clearActive()
                }}
              >
                <MenuItem value="">
                  <em>No environment</em>
                </MenuItem>
                {environments.map((env) => (
                  <MenuItem key={env.id} value={env.id}>
                    {env.name}
                    {env.isActive && (
                      <Chip label="Active" size="small" color="primary" sx={{ ml: 1, height: 20 }} />
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={createEnv}>
              New
            </Button>
          </Box>

          {activeEnv ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {editingName ? (
                  <TextField
                    size="small"
                    fullWidth
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={saveEnvName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEnvName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                  />
                ) : (
                  <>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
                      {activeEnv.name}
                    </Typography>
                    <IconButton size="small" onClick={startRename}>
                      <DriveFileRenameOutlineIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(activeEnv.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Variables — use {'{{variableName}}'} in requests
              </Typography>

              <List dense disablePadding>
                {activeEnv.variables.map((v: KeyValue, i: number) => (
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
            </>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                No environment selected. Create one or pick from the list above.
              </Typography>
            </Box>
          )}

          {environments.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" gutterBottom>
                All environments
              </Typography>
              {environments.map((env) => (
                <Box
                  key={env.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 0.75,
                    px: 1,
                    borderRadius: 1,
                    bgcolor: env.isActive ? 'action.selected' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => setActive(env.id)}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {env.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {env.variables.length} vars
                  </Typography>
                </Box>
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Environment"
        message="Delete this environment and all its variables?"
        onConfirm={deleteEnv}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
