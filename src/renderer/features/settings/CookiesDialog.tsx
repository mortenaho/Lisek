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
  ListItemText,
  Chip,
  Divider
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CookieRecord } from '@shared/types'
import ConfirmDialog from '../../components/ConfirmDialog'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CookiesDialog({ open, onClose }: Props) {
  const [cookies, setCookies] = useState<CookieRecord[]>([])
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    const list = await window.fluxAPI.cookies.list()
    setCookies(list)
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const grouped = useMemo(() => {
    const map = new Map<string, CookieRecord[]>()
    for (const cookie of cookies) {
      const list = map.get(cookie.domain) || []
      list.push(cookie)
      map.set(cookie.domain, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [cookies])

  const clearDomain = async (domain: string) => {
    await window.fluxAPI.cookies.clearDomain(domain)
    await load()
  }

  const clearAll = async () => {
    await window.fluxAPI.cookies.clearAll()
    setConfirmClear(false)
    await load()
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={600}>
            Cookie Jar
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Cookies are stored automatically from responses and sent on matching domains
          </Typography>
          {grouped.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              No cookies stored
            </Typography>
          ) : (
            grouped.map(([domain, domainCookies]) => (
              <Box key={domain} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label={domain} size="small" color="primary" variant="outlined" />
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {domainCookies.length} cookie{domainCookies.length !== 1 ? 's' : ''}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => void clearDomain(domain)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense disablePadding>
                  {domainCookies.map((cookie) => (
                    <ListItem key={`${cookie.name}-${cookie.path}`} sx={{ py: 0.25, pl: 1 }}>
                      <ListItemText
                        primary={`${cookie.name}=${cookie.value}`}
                        secondary={`Path: ${cookie.path}${cookie.secure ? ' · Secure' : ''}`}
                        primaryTypographyProps={{ variant: 'caption', fontFamily: 'monospace' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button color="error" disabled={cookies.length === 0} onClick={() => setConfirmClear(true)}>
            Clear All
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmClear}
        title="Clear All Cookies"
        message="Remove all stored cookies? They will not be sent on future requests until set again."
        onConfirm={() => void clearAll()}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  )
}
