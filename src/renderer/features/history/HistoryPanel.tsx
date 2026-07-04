import { Box, List, ListItemButton, ListItemText, Button, Typography, Chip } from '@mui/material'
import { useAppStore } from '../../stores/appStore'

export default function HistoryPanel() {
  const history = useAppStore((s) => s.history)
  const openHistoryItem = useAppStore((s) => s.openHistoryItem)
  const loadHistory = useAppStore((s) => s.loadHistory)

  const clearHistory = async () => {
    await window.lisek.history.clear()
    await loadHistory()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Recent requests
        </Typography>
        <Button size="small" onClick={clearHistory}>
          Clear
        </Button>
      </Box>
      <List dense disablePadding>
        {history.map((h) => (
          <ListItemButton
            key={h.id}
            onClick={() => openHistoryItem(h)}
            sx={{ py: 0.5 }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={h.statusCode || 'ERR'}
                    size="small"
                    color={h.statusCode >= 200 && h.statusCode < 300 ? 'success' : 'error'}
                    sx={{ height: 20, fontSize: 11 }}
                  />
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                    {h.method} {h.url}
                  </Typography>
                </Box>
              }
              secondary={`${h.durationMs}ms`}
            />
          </ListItemButton>
        ))}
        {history.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            No history yet
          </Typography>
        )}
      </List>
    </Box>
  )
}
