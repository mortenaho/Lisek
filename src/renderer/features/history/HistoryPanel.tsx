import { Box, List, ListItemButton, ListItemText, Button, Typography, Chip } from '@mui/material'
import { useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import type { HistoryModel } from '@shared/types'

function bucketHistory(history: HistoryModel[]) {
  const buckets = new Map<string, { count: number; ok: number; avgMs: number }>()
  for (const item of history) {
    const hour = new Date(item.sentAt)
    hour.setMinutes(0, 0, 0)
    const key = hour.toISOString()
    const current = buckets.get(key) || { count: 0, ok: 0, avgMs: 0 }
    current.count += 1
    if (item.statusCode >= 200 && item.statusCode < 300) current.ok += 1
    current.avgMs += item.durationMs
    buckets.set(key, current)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, value]) => ({
      label: new Date(key).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      count: value.count,
      okRate: value.count ? Math.round((value.ok / value.count) * 100) : 0,
      avgMs: value.count ? Math.round(value.avgMs / value.count) : 0
    }))
}

function HistoryTimeline({ history }: { history: HistoryModel[] }) {
  const buckets = useMemo(() => bucketHistory(history), [history])
  if (buckets.length === 0) return null

  const max = Math.max(...buckets.map((b) => b.count), 1)

  return (
    <Box sx={{ mb: 1.5, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        Timeline (requests per hour)
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 72 }}>
        {buckets.map((bucket) => (
          <Box key={bucket.label} sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <Box
              title={`${bucket.count} requests · ${bucket.okRate}% ok · ${bucket.avgMs}ms avg`}
              sx={{
                mx: 'auto',
                width: '100%',
                maxWidth: 28,
                height: `${Math.max(8, (bucket.count / max) * 56)}px`,
                bgcolor: bucket.okRate >= 80 ? 'success.main' : bucket.okRate >= 50 ? 'warning.main' : 'error.main',
                borderRadius: 0.5,
                opacity: 0.85
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, display: 'block', mt: 0.25 }} noWrap>
              {bucket.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

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
      <HistoryTimeline history={history} />
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
          <ListItemButton key={h.id} onClick={() => openHistoryItem(h)} sx={{ py: 0.5 }}>
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
