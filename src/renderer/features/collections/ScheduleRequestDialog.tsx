import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useEffect, useState } from 'react'
import type { RequestModel, ScheduledJobModel } from '@shared/types'

interface Props {
  open: boolean
  request: RequestModel | null
  onClose: () => void
}

export default function ScheduleRequestDialog({ open, request, onClose }: Props) {
  const [scheduleExpr, setScheduleExpr] = useState('@every 5m')
  const [notify, setNotify] = useState(true)
  const [jobs, setJobs] = useState<ScheduledJobModel[]>([])

  const refresh = async () => {
    const all = await window.lisek.schedule.list()
    setJobs(request ? all.filter((job) => job.requestId === request.id) : all)
  }

  useEffect(() => {
    if (open) void refresh()
  }, [open, request?.id])

  const save = async () => {
    if (!request) return
    await window.lisek.schedule.save({
      requestId: request.id,
      scheduleExpr,
      notify,
      enabled: true
    })
    await refresh()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule Request</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {request ? `${request.method} ${request.name}` : 'Select a request'}
        </Typography>
        <Stack spacing={1.25}>
          <TextField
            size="small"
            label="Schedule"
            value={scheduleExpr}
            onChange={(e) => setScheduleExpr(e.target.value)}
            helperText="Examples: @every 30s, @every 5m, @every 1h"
            fullWidth
          />
          <FormControlLabel
            control={<Switch checked={notify} onChange={(e) => setNotify(e.target.checked)} />}
            label="Desktop notification"
          />
          <Button variant="contained" size="small" onClick={() => void save()} disabled={!request}>
            Save schedule
          </Button>
        </Stack>

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Active schedules
        </Typography>
        <List dense>
          {jobs.map((job) => (
            <ListItem
              key={job.id}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => void window.lisek.schedule.runNow(job.id).then(refresh)}>
                    <PlayArrowIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => void window.lisek.schedule.delete(job.id).then(refresh)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={job.scheduleExpr}
                secondary={job.lastRunAt ? `Last run: ${new Date(job.lastRunAt).toLocaleString()}` : 'Not run yet'}
              />
            </ListItem>
          ))}
          {jobs.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No schedules for this request.
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
