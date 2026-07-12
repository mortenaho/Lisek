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
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import { v4 as uuidv4 } from 'uuid'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyValue } from '@shared/types'
import { useAppStore } from '../../stores/appStore'
import ConfirmDialog from '../../components/ConfirmDialog'
import { applyControlledInputChange } from '../../utils/inputSelection'

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
  const [variables, setVariables] = useState<KeyValue[]>([])
  const variablesRef = useRef(variables)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  variablesRef.current = variables

  useEffect(() => {
    if (!open) return
    setVariables(activeEnv?.variables.map((v) => ({ ...v })) ?? [])
  }, [open, activeEnv?.id])

  const persistVariables = useCallback(
    async (vars: KeyValue[]) => {
      const env = useAppStore.getState().environments.find((e) => e.isActive)
      if (!env) return
      await window.lisek.environments.save({ ...env, variables: vars })
      await loadEnvironments()
    },
    [loadEnvironments]
  )

  const schedulePersist = useCallback(
    (vars: KeyValue[]) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null
        void persistVariables(vars)
      }, 400)
    },
    [persistVariables]
  )

  const flushPersist = useCallback(async () => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
    if (!activeEnv) return
    await persistVariables(variablesRef.current)
  }, [activeEnv, persistVariables])

  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    },
    []
  )

  const handleClose = () => {
    void flushPersist().finally(onClose)
  }

  const updateVar = (index: number, field: 'key' | 'value' | 'secret', value: string | boolean) => {
    setVariables((vars) => {
      const next = vars.map((row, i) => (i === index ? { ...row, [field]: value } : row))
      schedulePersist(next)
      return next
    })
  }

  const addVar = () => {
    setVariables((vars) => {
      const next = [...vars, { id: uuidv4(), key: '', value: '', enabled: true }]
      schedulePersist(next)
      return next
    })
  }

  const removeVar = (index: number) => {
    setVariables((vars) => {
      const next = vars.filter((_, i) => i !== index)
      schedulePersist(next)
      return next
    })
  }

  const createEnv = async () => {
    await window.lisek.environments.save({ name: 'New Environment', variables: [], isActive: false })
    await loadEnvironments()
  }

  const setActive = async (id: string) => {
    await window.lisek.environments.setActive(id)
    await loadEnvironments()
  }

  const clearActive = async () => {
    await window.lisek.environments.setActive(null)
    await loadEnvironments()
  }

  const saveEnvName = async () => {
    if (!activeEnv || !nameDraft.trim()) {
      setEditingName(false)
      return
    }
    await window.lisek.environments.save({ ...activeEnv, name: nameDraft.trim() })
    await loadEnvironments()
    setEditingName(false)
  }

  const deleteEnv = async () => {
    if (!deleteId) return
    await window.lisek.environments.delete(deleteId)
    await loadEnvironments()
    setDeleteId(null)
  }

  const startRename = () => {
    if (!activeEnv) return
    setNameDraft(activeEnv.name)
    setEditingName(true)
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Environments
          </Typography>
          <IconButton size="small" onClick={handleClose}>
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
                {variables.map((v, i) => (
                  <ListItem key={v.id} disableGutters sx={{ gap: 1, py: 0.5 }}>
                    <TextField
                      size="small"
                      placeholder="Variable"
                      value={v.key}
                      onChange={(e) => {
                        applyControlledInputChange(e.target, v.key, e.target.value, (val) =>
                          updateVar(i, 'key', val)
                        )
                      }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      placeholder="Value"
                      type={v.secret ? 'password' : 'text'}
                      value={v.value}
                      onChange={(e) => {
                        applyControlledInputChange(e.target, v.value, e.target.value, (val) =>
                          updateVar(i, 'value', val)
                        )
                      }}
                      sx={{ flex: 1.5 }}
                    />
                    <IconButton
                      size="small"
                      color={v.secret ? 'warning' : 'default'}
                      onClick={() => updateVar(i, 'secret', !v.secret)}
                    >
                      {v.secret ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                    </IconButton>
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
          <Button onClick={handleClose}>Close</Button>
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
