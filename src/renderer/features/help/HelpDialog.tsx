import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

interface Section {
  id: string
  title: string
  summary: string
  steps: string[]
}

const SECTIONS: Section[] = [
  {
    id: 'send',
    title: 'Send your first request',
    summary: 'Create a request, set method and URL, then send.',
    steps: [
      'In Collections, create a folder or request (or open an existing one).',
      'Choose the method (GET, POST, …) and enter the URL in the address bar.',
      'Add query params, headers, auth, or a body if needed.',
      'Press Send or Ctrl+Enter. The response appears beside the request.',
      'Use {{variable}} in URL, headers, or body — values come from the active environment or collection.'
    ]
  },
  {
    id: 'collections',
    title: 'Collections & folders',
    summary: 'Organize requests, variables, and run them in bulk.',
    steps: [
      'Left rail → Collections: create folders, nest them, pin favorites.',
      'Right-click a collection for rename, variables, description, runner, import/export, or delete.',
      'Drag requests between collections to reorganize.',
      'Collection Runner runs all requests with optional data files and stop-on-failure.',
      'Link a collection to a folder for git-friendly push/pull sync.'
    ]
  },
  {
    id: 'environments',
    title: 'Environments & variables',
    summary: 'Switch base URLs and secrets without editing every request.',
    steps: [
      'Open the environment selector in the top bar to create or switch environments.',
      'Define key/value pairs (e.g. baseUrl, token).',
      'Reference them as {{baseUrl}} / {{token}} in requests.',
      'Collection variables work the same way and apply within that collection.',
      'From a JSON response, open JSONPath (Ctrl+F) and save a result into an environment variable.'
    ]
  },
  {
    id: 'import-export',
    title: 'Import & export',
    summary: 'Bring work from other tools or share collections.',
    steps: [
      'Left rail → Import: Postman, OpenAPI/Swagger, Insomnia, Bruno, HAR, or cURL.',
      'Right-click a collection → Import cURL to add a request into that collection.',
      'Export a collection as Postman, OpenAPI, Insomnia, or Bruno.',
      'OpenAPI panel: import a spec, browse paths, generate requests, and create an environment from servers.',
      'Settings → Workspace Backup to export/restore the whole workspace.'
    ]
  },
  {
    id: 'protocols',
    title: 'GraphQL, WebSocket, SSE & gRPC',
    summary: 'Use protocol-specific tabs on a request.',
    steps: [
      'Change the protocol on the request (HTTP, GraphQL, WebSocket, SSE, gRPC).',
      'GraphQL: edit query/variables, introspect the schema, or subscribe over WebSocket.',
      'WebSocket / SSE: connect and watch the live message log.',
      'gRPC: import a .proto (file or URL) from the Proto Files panel, pick service/method, or use server reflection.'
    ]
  },
  {
    id: 'response',
    title: 'Response panel',
    summary: 'Inspect body, headers, cookies, tests, and extract values.',
    steps: [
      'Tabs: Body, Headers, Cookies, Tests, Console.',
      'Copy or download the body; toggle word wrap; preview images/PDF when applicable.',
      'JSONPath (search icon or Ctrl+F): query JSON and optionally save to an environment variable.',
      'Save a snapshot and diff later responses against it.',
      'History (left rail) lists past sends so you can reopen them.'
    ]
  },
  {
    id: 'tools',
    title: 'Cookies, mock server & plugins',
    summary: 'Local helpers for auth cookies, stubs, and encoding tools.',
    steps: [
      'Cookie Jar (left rail): view and clear cookies stored by responses.',
      'Mock Server: add routes with status/body/file and a live indicator when running.',
      'Plugins panel: JWT, Base64, Hash, URL encode, and crypto helpers.',
      'cURL Snippet: copy the current request as a curl command.'
    ]
  },
  {
    id: 'shortcuts',
    title: 'Useful shortcuts',
    summary: 'Speed up everyday actions.',
    steps: [
      'Ctrl+K — search collections, requests, and history.',
      'Ctrl+Enter — send the active request.',
      'Ctrl+W — close the active tab · middle-click a tab to close it.',
      'Ctrl+F — open JSONPath when the response body is JSON.',
      'Esc — close dialogs or the JSONPath panel.',
      'F1 — open this Help dialog.'
    ]
  }
]

interface Props {
  open: boolean
  onClose: () => void
  onShowShortcuts?: () => void
}

export default function HelpDialog({ open, onClose, onShowShortcuts }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <HelpOutlineIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Help
          </Typography>
          <Chip label="Getting started" size="small" color="primary" variant="outlined" sx={{ height: 22 }} />
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Lisek is an offline API client for HTTP, GraphQL, WebSocket, SSE, and gRPC. Scroll through the topics
          below to learn how to use the app.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {SECTIONS.map((section, index) => (
            <Box key={section.id}>
              {index > 0 && <Divider sx={{ mb: 2.5 }} />}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                {section.summary}
              </Typography>
              <Box component="ol" sx={{ m: 0, pl: 2.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {section.steps.map((step) => (
                  <Typography key={step} component="li" variant="body2">
                    {step}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.25, justifyContent: 'space-between' }}>
        {onShowShortcuts ? (
          <Button
            onClick={() => {
              onClose()
              onShowShortcuts()
            }}
          >
            Keyboard shortcuts
          </Button>
        ) : (
          <span />
        )}
        <Button variant="contained" onClick={onClose}>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  )
}
