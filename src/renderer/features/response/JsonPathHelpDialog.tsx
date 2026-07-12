import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Divider,
  Chip
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SearchIcon from '@mui/icons-material/Search'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import BoltIcon from '@mui/icons-material/Bolt'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

interface Example {
  label: string
  query: string
  description: string
}

const STEPS = [
  {
    icon: <SearchIcon fontSize="small" color="primary" />,
    title: 'Open the panel',
    body: 'In the Response toolbar click the search icon, or press Ctrl+F when the body is JSON.'
  },
  {
    icon: <PlayArrowIcon fontSize="small" color="primary" />,
    title: 'Write a query and run it',
    body: 'Type a JSONPath (for example $.data.items[0].id) and press Enter or click the search button.'
  },
  {
    icon: <DragHandleIcon fontSize="small" color="primary" />,
    title: 'Enlarge the result area',
    body: 'Drag the colored bar above the panel upward to give more space to the query result.'
  },
  {
    icon: <BoltIcon fontSize="small" color="primary" />,
    title: 'Save into an environment variable',
    body: 'Enter a variable name (for example token) and click the bolt icon to set {{token}} from the query result.'
  },
  {
    icon: <KeyboardIcon fontSize="small" color="primary" />,
    title: 'Shortcuts',
    body: 'Enter runs the query. Esc closes the panel. Ctrl+F opens it again.'
  }
]

const EXAMPLES: Example[] = [
  { label: 'Root', query: '$', description: 'Entire JSON document' },
  { label: 'Property', query: '$.data', description: 'Top-level field named data' },
  { label: 'Shorthand', query: 'data.user.name', description: '$ prefix is added automatically' },
  { label: 'Array index', query: '$.items[0]', description: 'First element of items array' },
  { label: 'Last item', query: '$.items[-1]', description: 'Last element (JSONPath syntax)' },
  { label: 'All in array', query: '$.items[*].name', description: 'name from every item' },
  { label: 'Recursive', query: '$..id', description: 'Find id anywhere in the tree' },
  { label: 'Wildcard key', query: '$.*', description: 'All top-level property values' },
  { label: 'Filter', query: '$.items[?(@.price > 10)]', description: 'Items where price > 10' },
  { label: 'Slice', query: '$.items[0:3]', description: 'First three array elements' }
]

const OPERATORS = [
  { op: '$', desc: 'Root element' },
  { op: '.', desc: 'Child property (data.user)' },
  { op: '[n]', desc: 'Array index (items[0])' },
  { op: '[*]', desc: 'All elements in array' },
  { op: '..', desc: 'Recursive descent (find at any depth)' },
  { op: '[?()]', desc: 'Filter expression' }
]

interface Props {
  open: boolean
  onClose: () => void
  onUseExample: (query: string) => void
}

export default function JsonPathHelpDialog({ open, onClose, onUseExample }: Props) {
  const copy = async (text: string) => {
    await window.lisek.clipboard.writeText(text)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700}>
            Help
          </Typography>
          <Chip label="JSONPath panel" size="small" color="primary" variant="outlined" sx={{ height: 22 }} />
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use this panel to extract values from a JSON response, preview them, and optionally save them as
          environment variables for later requests.
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          How to use the panel
        </Typography>
        <List dense disablePadding sx={{ mb: 2 }}>
          {STEPS.map((step, index) => (
            <ListItem
              key={step.title}
              alignItems="flex-start"
              sx={{
                px: 1,
                py: 1,
                mb: 0.75,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper'
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>{step.icon}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={700}>
                    {index + 1}. {step.title}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {step.body}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          JSONPath operators
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          You can omit the leading{' '}
          <Box component="code" sx={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}>
            $
          </Box>
          — Lisek adds it automatically.
        </Typography>
        <Table size="small" sx={{ mb: 2.5, '& td, & th': { py: 0.75, borderColor: 'divider' } }}>
          <TableHead>
            <TableRow>
              <TableCell width="20%">Syntax</TableCell>
              <TableCell>Meaning</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {OPERATORS.map((row) => (
              <TableRow key={row.op}>
                <TableCell>
                  <Box component="code" sx={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                    {row.op}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.desc}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          Try an example
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Click <strong>Use</strong> to put the query into the panel, then press Enter to run it on the current
          response.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {EXAMPLES.map((ex) => (
            <Box
              key={ex.query}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {ex.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: 'Consolas, monospace', display: 'block', color: 'primary.main' }}
                >
                  {ex.query}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ex.description}
                </Typography>
              </Box>
              <Tooltip title="Copy">
                <IconButton size="small" onClick={() => void copy(ex.query)}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  onUseExample(ex.query)
                  onClose()
                }}
              >
                Use
              </Button>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onClose} variant="contained">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  )
}
