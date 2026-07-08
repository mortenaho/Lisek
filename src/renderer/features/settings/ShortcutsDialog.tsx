import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material'

const SHORTCUTS = [
  { keys: 'Ctrl+K', action: 'Open search / command palette' },
  { keys: 'Ctrl+Enter', action: 'Send request' },
  { keys: 'Enter', action: 'Send request (when URL field is focused)' },
  { keys: 'Ctrl+W', action: 'Close active tab' },
  { keys: 'Esc', action: 'Close dialogs / JSONPath panel' }
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function ShortcutsDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Keyboard Shortcuts</DialogTitle>
      <DialogContent dividers>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Shortcut</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {SHORTCUTS.map((row) => (
              <TableRow key={row.keys}>
                <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.keys}</TableCell>
                <TableCell>{row.action}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
