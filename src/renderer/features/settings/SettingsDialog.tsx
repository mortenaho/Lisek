import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  Box,
  Divider,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { Settings } from '@shared/types'
import { useAppStore } from '../../stores/appStore'

interface Props {
  open: boolean
  onClose: () => void
  onShowAbout?: () => void
  onShowShortcuts?: () => void
  onShowHelp?: () => void
}

export default function SettingsDialog({ open, onClose, onShowAbout, onShowShortcuts, onShowHelp }: Props) {
  const setThemeMode = useAppStore((s) => s.setThemeMode)
  const loadInitial = useAppStore((s) => s.loadInitial)
  const [settings, setSettings] = useState<Settings>({
    sslVerify: true,
    timeoutMs: 30000,
    followRedirects: true,
    theme: 'light',
    autoUpdate: true
  })
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      window.lisek.settings.get().then(setSettings)
      setBackupStatus(null)
      setUpdateStatus(null)
    }
  }, [open])

  const checkForUpdate = async () => {
    setUpdateStatus('Checking…')
    const result = await window.lisek.app.checkForUpdate()
    if (result.error) {
      setUpdateStatus(`Could not check: ${result.error}`)
      return
    }
    if (result.updateAvailable && result.latestVersion) {
      setUpdateStatus(`New version available: v${result.latestVersion}`)
      if (result.releaseUrl) void window.lisek.shell.openExternal(result.releaseUrl)
      return
    }
    setUpdateStatus(`You're up to date (v${result.currentVersion})`)
  }

  const save = async () => {
    await window.lisek.settings.set(settings)
    setThemeMode(settings.theme)
    onClose()
  }

  const exportWorkspace = async () => {
    const path = await window.lisek.dialog.saveFile('lisek-workspace.json', [
      { name: 'JSON', extensions: ['json'] }
    ])
    if (!path) return
    await window.lisek.workspace.export(path)
    setBackupStatus('Workspace exported successfully')
  }

  const importWorkspace = async () => {
    const path = await window.lisek.dialog.openFile([{ name: 'JSON', extensions: ['json'] }])
    if (!path) return
    await window.lisek.workspace.import(path)
    await loadInitial()
    setBackupStatus('Workspace restored successfully')
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
          <TextField
            label="HTTP Proxy URL"
            size="small"
            placeholder="http://127.0.0.1:8888"
            value={settings.proxyUrl || ''}
            onChange={(e) => setSettings({ ...settings, proxyUrl: e.target.value })}
            helperText="Optional proxy for HTTP, GraphQL, and collection runner"
          />
          <TextField
            label="Default Runner Iterations"
            type="number"
            size="small"
            value={settings.runnerIterations ?? 1}
            onChange={(e) =>
              setSettings({ ...settings, runnerIterations: Math.max(1, parseInt(e.target.value, 10) || 1) })
            }
          />
          <TextField
            label="Default Runner Delay (ms)"
            type="number"
            size="small"
            value={settings.runnerDelayMs ?? 0}
            onChange={(e) =>
              setSettings({ ...settings, runnerDelayMs: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
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
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoUpdate !== false}
                onChange={(e) => setSettings({ ...settings, autoUpdate: e.target.checked })}
              />
            }
            label="Notify when a new version is available"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => void checkForUpdate()}>
              Check for updates
            </Button>
            {updateStatus && (
              <Typography variant="caption" color="text.secondary">
                {updateStatus}
              </Typography>
            )}
          </Box>

          <Divider />

          <Typography variant="subtitle2">Workspace Backup</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => void exportWorkspace()}>
              Export backup
            </Button>
            <Button size="small" variant="outlined" color="warning" onClick={() => void importWorkspace()}>
              Restore backup
            </Button>
          </Box>
          {backupStatus && (
            <Typography variant="caption" color="success.main">
              {backupStatus}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={() => {
              onClose()
              onShowHelp?.()
            }}
          >
            Help
          </Button>
          <Button
            size="small"
            onClick={() => {
              onClose()
              onShowAbout?.()
            }}
          >
            About
          </Button>
          <Button
            size="small"
            onClick={() => {
              onClose()
              onShowShortcuts?.()
            }}
          >
            Shortcuts
          </Button>
        </Box>
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
