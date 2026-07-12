import { Alert, Button, Snackbar } from '@mui/material'
import { useEffect, useState } from 'react'
import type { UpdateCheckResult } from '@shared/types'

const DISMISS_KEY = 'lisek:dismissed-update-version'

function wasDismissed(version: string): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === version
  } catch {
    return false
  }
}

function dismiss(version: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, version)
  } catch {
    /* ignore quota / private mode */
  }
}

export default function UpdateNotifier() {
  const [update, setUpdate] = useState<UpdateCheckResult | null>(null)

  useEffect(() => {
    const unsubscribe = window.lisek.app.onUpdateAvailable((result) => {
      if (!result.updateAvailable || !result.latestVersion) return
      if (wasDismissed(result.latestVersion)) return
      setUpdate(result)
    })
    return unsubscribe
  }, [])

  const close = () => {
    if (update?.latestVersion) dismiss(update.latestVersion)
    setUpdate(null)
  }

  const download = () => {
    if (update?.releaseUrl) {
      void window.lisek.shell.openExternal(update.releaseUrl)
    }
    close()
  }

  return (
    <Snackbar
      open={Boolean(update)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ mb: 1, mr: 1 }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={close}
        sx={{ alignItems: 'center', maxWidth: 420 }}
        action={
          <Button color="inherit" size="small" onClick={download} sx={{ fontWeight: 700 }}>
            Download
          </Button>
        }
      >
        New version available: v{update?.latestVersion} (you have v{update?.currentVersion})
      </Alert>
    </Snackbar>
  )
}
