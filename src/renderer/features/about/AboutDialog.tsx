import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import LanguageIcon from '@mui/icons-material/Language'
import PersonIcon from '@mui/icons-material/Person'
import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/types'
import { APP_LOGO } from '../../utils/assets'

interface Props {
  open: boolean
  onClose: () => void
}

export default function AboutDialog({ open, onClose }: Props) {
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    if (open) {
      window.lisek.app.getInfo().then(setInfo)
    }
  }, [open])

  const openLink = (url: string) => {
    void window.lisek.shell.openExternal(url)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box
            component="img"
            src={APP_LOGO}
            alt="Lisek"
            sx={{ width: 64, height: 64, display: 'block' }}
          />
          <Typography variant="h6" fontWeight={700}>
            {info?.name ?? 'Lisek'}
          </Typography>
          {info && (
            <Chip label={`v${info.version}`} size="small" color="primary" variant="outlined" />
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2.5 }}>
          {info?.description ?? 'Offline API client for HTTP, GraphQL, WebSocket, and gRPC'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2">
              <Typography component="span" variant="body2" color="text.secondary">
                Author:{' '}
              </Typography>
              {info?.author ?? '—'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon fontSize="small" color="action" />
            <Link
              component="button"
              variant="body2"
              underline="hover"
              onClick={() => info?.email && openLink(`mailto:${info.email}`)}
              sx={{ textAlign: 'left' }}
            >
              {info?.email ?? '—'}
            </Link>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LanguageIcon fontSize="small" color="action" />
            <Link
              component="button"
              variant="body2"
              underline="hover"
              onClick={() => info?.website && openLink(info.website)}
              sx={{ textAlign: 'left' }}
            >
              {info?.website ?? '—'}
            </Link>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose} fullWidth>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
