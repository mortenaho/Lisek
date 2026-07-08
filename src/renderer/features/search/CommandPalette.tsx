import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  Box,
  Chip
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

export default function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const collections = useAppStore((s) => s.collections)
  const requests = useAppStore((s) => s.requests)
  const history = useAppStore((s) => s.history)
  const selectRequest = useAppStore((s) => s.selectRequest)
  const setActiveSidebar = useAppStore((s) => s.setActiveSidebar)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const items: { id: string; label: string; subtitle: string; kind: 'request' | 'collection' | 'history'; action: () => void }[] = []

    for (const col of collections) {
      if (col.name.toLowerCase().includes(q)) {
        items.push({
          id: `col-${col.id}`,
          label: col.name,
          subtitle: 'Collection',
          kind: 'collection',
          action: () => setActiveSidebar('collections')
        })
      }
    }

    for (const req of requests) {
      if (req.name.toLowerCase().includes(q) || req.url.toLowerCase().includes(q)) {
        items.push({
          id: `req-${req.id}`,
          label: req.name,
          subtitle: `${req.method} ${req.url}`,
          kind: 'request',
          action: () => void selectRequest(req)
        })
      }
    }

    for (const item of history.slice(0, 50)) {
      if (item.url.toLowerCase().includes(q) || item.method.toLowerCase().includes(q)) {
        items.push({
          id: `hist-${item.id}`,
          label: `${item.method} ${item.url}`,
          subtitle: `History · ${item.statusCode}`,
          kind: 'history',
          action: () => {
            setActiveSidebar('history')
            void selectRequest(item.requestSnapshot)
          }
        })
      }
    }

    return items.slice(0, 20)
  }, [query, collections, requests, history, selectRequest, setActiveSidebar])

  const run = (action: () => void) => {
    action()
    setOpen(false)
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Search</DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search collections, requests, history…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              e.preventDefault()
              run(results[0].action)
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
            }
          }}
        />
        <List dense disablePadding sx={{ mt: 1, maxHeight: 360, overflow: 'auto' }}>
          {results.length === 0 && query.trim() && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No matches
            </Typography>
          )}
          {results.map((item) => (
            <ListItemButton key={item.id} onClick={() => run(item.action)} sx={{ borderRadius: 1 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.label}
                    <Chip label={item.kind} size="small" sx={{ height: 18, fontSize: 10 }} />
                  </Box>
                }
                secondary={item.subtitle}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
              />
            </ListItemButton>
          ))}
        </List>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Enter to open · Esc to close
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
