import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  Box
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { Settings } from '@shared/types'
import { useAppStore } from '../../stores/appStore'

interface Props {
  open: boolean
  onClose: () => void
  onShowAbout?: () => void
}

export default function SettingsDialog({ open, onClose, onShowAbout }: Props) {
  const setThemeMode = useAppStore((s) => s.setThemeMode)
  const [settings, setSettings] = useState<Settings>({
    sslVerify: true,
    timeoutMs: 30000,
    followRedirects: true,
    theme: 'light'
  })

  useEffect(() => {
    if (open) {
      window.fluxAPI.settings.get().then(setSettings)
    }
  }, [open])

  const save = async () => {
    await window.fluxAPI.settings.set(settings)
    setThemeMode(settings.theme)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.sslVerify}
                onChange={(e) => setSettings({ ...settings, sslVerify: e.target.checked })}
              />
            }
            label="SSL Certificate Verification"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.followRedirects}
                onChange={(e) => setSettings({ ...settings, followRedirects: e.target.checked })}
              />
            }
            label="Follow Redirects"
          />
          <TextField
            label="Request Timeout (ms)"
            type="number"
            size="small"
            value={settings.timeoutMs}
            onChange={(e) => setSettings({ ...settings, timeoutMs: parseInt(e.target.value, 10) || 30000 })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.theme === 'dark'}
                onChange={(e) =>
                  setSettings({ ...settings, theme: e.target.checked ? 'dark' : 'light' })
                }
              />
            }
            label="Dark Theme"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button
          size="small"
          onClick={() => {
            onClose()
            onShowAbout?.()
          }}
        >
          About
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={save}>
            Save
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
