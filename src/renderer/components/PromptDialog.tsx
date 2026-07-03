import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'

interface Props {
  open: boolean
  title: string
  label?: string
  defaultValue?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export default function PromptDialog({
  open,
  title,
  label = 'Name',
  defaultValue = '',
  confirmLabel = 'Create',
  onConfirm,
  onCancel
}: Props) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(defaultValue)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [open, defaultValue])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          inputRef={inputRef}
          autoFocus
          fullWidth
          margin="dense"
          label={label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onCancel()
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={!value.trim()}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
