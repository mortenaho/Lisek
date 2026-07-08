import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CookieIcon from '@mui/icons-material/Cookie'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LockIcon from '@mui/icons-material/Lock'
import PublicIcon from '@mui/icons-material/Public'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CookieRecord } from '@shared/types'
import ConfirmDialog from '../../components/ConfirmDialog'
import { COMPACT } from '../../theme/compact'

interface Props {
  open: boolean
  onClose: () => void
}

function formatExpiry(expires?: number): string {
  if (!expires) return 'Session'
  if (expires <= Date.now()) return 'Expired'
  return new Date(expires).toLocaleString()
}

function truncateValue(value: string, max = 56): string {
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

function CookieValueRow({
  cookie,
  showValues,
  expanded,
  copied,
  onToggleExpand,
  onCopy
}: {
  cookie: CookieRecord
  showValues: boolean
  expanded: boolean
  copied: boolean
  onToggleExpand: () => void
  onCopy: () => void
}) {
  const displayValue = showValues ? (expanded ? cookie.value : truncateValue(cookie.value)) : '••••••••'
  const canExpand = showValues && cookie.value.length > 56

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: 'background.default',
        '&:hover': { borderColor: 'primary.light' }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.5 }}>
        <Typography
          component="span"
          sx={{
            flex: 1,
            fontFamily: 'Consolas, monospace',
            fontSize: 12,
            fontWeight: 600,
            wordBreak: 'break-word'
          }}
        >
          {cookie.name}
        </Typography>
        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
          {canExpand && (
            <Tooltip title={expanded ? 'Collapse' : 'Show full value'}>
              <IconButton size="small" onClick={onToggleExpand} sx={COMPACT.iconBtn}>
                {expanded ? <ExpandMoreIcon sx={{ ...COMPACT.icon, transform: 'rotate(180deg)' }} /> : <ExpandMoreIcon sx={COMPACT.icon} />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={copied ? 'Copied!' : 'Copy value'}>
            <IconButton size="small" onClick={onCopy} sx={COMPACT.iconBtn}>
              <ContentCopyIcon sx={COMPACT.icon} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Typography
        sx={{
          fontFamily: 'Consolas, monospace',
          fontSize: 11,
          lineHeight: 1.45,
          color: 'text.secondary',
          wordBreak: 'break-all',
          mb: 0.75
        }}
      >
        {displayValue}
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
        <Chip label={`Path: ${cookie.path}`} size="small" variant="outlined" sx={COMPACT.chip} />
        <Chip label={formatExpiry(cookie.expires)} size="small" variant="outlined" sx={COMPACT.chip} />
        {cookie.secure && (
          <Chip icon={<LockIcon sx={{ fontSize: '12px !important' }} />} label="Secure" size="small" color="success" variant="outlined" sx={COMPACT.chip} />
        )}
        {cookie.httpOnly && (
          <Chip label="HttpOnly" size="small" color="info" variant="outlined" sx={COMPACT.chip} />
        )}
      </Stack>
    </Paper>
  )
}

export default function CookiesDialog({ open, onClose }: Props) {
  const [cookies, setCookies] = useState<CookieRecord[]>([])
  const [search, setSearch] = useState('')
  const [showValues, setShowValues] = useState(true)
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [domainToClear, setDomainToClear] = useState<string | null>(null)
  const [expandedValues, setExpandedValues] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.lisek.cookies.list()
      setCookies(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      setExpandedValues(new Set())
      void load()
    }
  }, [open, load])

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? cookies.filter(
          (cookie) =>
            cookie.name.toLowerCase().includes(q) ||
            cookie.value.toLowerCase().includes(q) ||
            cookie.domain.toLowerCase().includes(q) ||
            cookie.path.toLowerCase().includes(q)
        )
      : cookies

    const map = new Map<string, CookieRecord[]>()
    for (const cookie of filtered) {
      const list = map.get(cookie.domain) || []
      list.push(cookie)
      map.set(cookie.domain, list)
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([domain, domainCookies]) => [
        domain,
        domainCookies.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))
      ] as const)
  }, [cookies, search])

  const stats = useMemo(
    () => ({
      domains: new Set(cookies.map((c) => c.domain)).size,
      total: cookies.length
    }),
    [cookies]
  )

  const copyValue = async (cookie: CookieRecord) => {
    await window.lisek.clipboard.writeText(cookie.value)
    const key = `${cookie.domain}|${cookie.path}|${cookie.name}`
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500)
  }

  const toggleValueExpand = (cookie: CookieRecord) => {
    const key = `${cookie.domain}|${cookie.path}|${cookie.name}`
    setExpandedValues((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const clearDomain = async () => {
    if (!domainToClear) return
    await window.lisek.cookies.clearDomain(domainToClear)
    setDomainToClear(null)
    await load()
  }

  const clearAll = async () => {
    await window.lisek.cookies.clearAll()
    setConfirmClear(false)
    await load()
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
            <Box
              sx={{
                mt: 0.25,
                width: 40,
                height: 40,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                flexShrink: 0
              }}
            >
              <CookieIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                Cookie Jar
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Cookies from responses are saved here and sent automatically on matching domains.
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ mt: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              px: 1.25,
              py: 1,
              mb: 2,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center'
            }}
          >
            <Chip label={`${stats.domains} domain${stats.domains !== 1 ? 's' : ''}`} size="small" color="primary" />
            <Chip label={`${stats.total} cookie${stats.total !== 1 ? 's' : ''}`} size="small" variant="outlined" />
            {search.trim() && grouped.length !== stats.domains && (
              <Chip label={`${grouped.reduce((n, [, list]) => n + list.length, 0)} matching`} size="small" variant="outlined" />
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title={showValues ? 'Hide values' : 'Show values'}>
              <IconButton size="small" onClick={() => setShowValues((v) => !v)}>
                {showValues ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <span>
                <IconButton size="small" onClick={() => void load()} disabled={loading}>
                  <RefreshIcon fontSize="small" sx={loading ? { animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } } : undefined} />
                </IconButton>
              </span>
            </Tooltip>
          </Paper>

          <TextField
            size="small"
            fullWidth
            placeholder="Search by domain, name, value, or path…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              )
            }}
          />

          {grouped.length === 0 ? (
            <Box
              sx={{
                py: 6,
                px: 2,
                textAlign: 'center',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                borderStyle: 'dashed'
              }}
            >
              <CookieIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {cookies.length === 0 ? 'No cookies yet' : 'No matches'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
                {cookies.length === 0
                  ? 'Send a request that returns Set-Cookie headers. Cookies will appear here and be reused on later requests to the same domain.'
                  : 'Try a different search term or clear the filter.'}
              </Typography>
              {search.trim() && (
                <Button size="small" sx={{ mt: 2 }} onClick={() => setSearch('')}>
                  Clear search
                </Button>
              )}
            </Box>
          ) : (
            <Stack spacing={1}>
              {grouped.map(([domain, domainCookies]) => (
                <Accordion
                  key={domain}
                  defaultExpanded
                  disableGutters
                  elevation={0}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: '8px !important',
                    overflow: 'hidden',
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      px: 1.25,
                      minHeight: 48,
                      bgcolor: 'action.hover',
                      '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1, my: 0.75 }
                    }}
                  >
                    <PublicIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1, wordBreak: 'break-all' }}>
                      {domain}
                    </Typography>
                    <Chip label={domainCookies.length} size="small" sx={COMPACT.chip} />
                    <Tooltip title="Clear domain cookies">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDomainToClear(domain)
                        }}
                        sx={COMPACT.iconBtn}
                      >
                        <DeleteOutlineIcon sx={COMPACT.icon} />
                      </IconButton>
                    </Tooltip>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 1.25, pt: 0.5 }}>
                    <Stack spacing={1}>
                      {domainCookies.map((cookie) => {
                        const key = `${cookie.domain}|${cookie.path}|${cookie.name}`
                        return (
                          <CookieValueRow
                            key={key}
                            cookie={cookie}
                            showValues={showValues}
                            expanded={expandedValues.has(key)}
                            copied={copiedKey === key}
                            onToggleExpand={() => toggleValueExpand(cookie)}
                            onCopy={() => void copyValue(cookie)}
                          />
                        )
                      })}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 2.5, py: 1.5 }}>
          <Button
            color="error"
            variant="outlined"
            disabled={cookies.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            Clear all
          </Button>
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

      <ConfirmDialog
        open={!!domainToClear}
        title="Clear Domain Cookies"
        message={`Remove all cookies for ${domainToClear}?`}
        onConfirm={() => void clearDomain()}
        onCancel={() => setDomainToClear(null)}
      />
    </>
  )
}
