import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  Tooltip,
  Divider,
  Chip
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import HistoryIcon from '@mui/icons-material/History'
import PublicIcon from '@mui/icons-material/Public'
import ApiIcon from '@mui/icons-material/Api'
import DescriptionIcon from '@mui/icons-material/Description'
import SettingsIcon from '@mui/icons-material/Settings'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import CodeIcon from '@mui/icons-material/Code'
import CookiesIcon from '@mui/icons-material/Cookie'
import { memo, useCallback, useRef, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import CollectionsPanel from '../features/collections/CollectionsPanel'
import HistoryPanel from '../features/history/HistoryPanel'
import OpenApiPanel from '../features/import/OpenApiPanel'
import ProtoPanel from '../features/grpc/ProtoPanel'
import EnvironmentsDialog from '../features/environments/EnvironmentsDialog'
import RequestBuilder from '../features/request/RequestBuilder'
import ResponsePanel from '../features/response/ResponsePanel'
import ImportDialog from '../features/import/ImportDialog'
import CurlSnippetDialog from '../features/snippets/CurlSnippetDialog'
import SettingsDialog from '../features/settings/SettingsDialog'
import CookiesDialog from '../features/settings/CookiesDialog'
import AboutDialog from '../features/about/AboutDialog'
import ResizeHandle, { clamp, readStoredSize, storeSize } from '../components/ResizeHandle'
import { APP_LOGO } from '../utils/assets'

const SIDEBAR_MIN = 220
const SIDEBAR_MAX = 520
const SIDEBAR_DEFAULT = 300
const RESPONSE_MIN = 150
const RESPONSE_DEFAULT = 320

const STORAGE_SIDEBAR = 'fluxapi:sidebar-width'
const STORAGE_RESPONSE = 'fluxapi:response-height'

const SIDEBAR_ITEMS = [
  { id: 'collections' as const, label: 'Collections', icon: <FolderIcon /> },
  { id: 'history' as const, label: 'History', icon: <HistoryIcon /> },
  { id: 'openapi' as const, label: 'Swagger / OpenAPI', icon: <DescriptionIcon /> },
  { id: 'proto' as const, label: 'Proto Files', icon: <ApiIcon /> }
]

const MemoRequestBuilder = memo(RequestBuilder)
const MemoResponsePanel = memo(ResponsePanel)

export default function MainLayout() {
  const activeSidebar = useAppStore((s) => s.activeSidebar)
  const setActiveSidebar = useAppStore((s) => s.setActiveSidebar)
  const themeMode = useAppStore((s) => s.setThemeMode)
  const currentTheme = useAppStore((s) => s.themeMode)
  const setImportDialog = useAppStore((s) => s.setImportDialog)
  const setSnippetOpen = useAppStore((s) => s.setSnippetOpen)
  const activeEnvName = useAppStore((s) => s.environments.find((e) => e.isActive)?.name ?? null)
  const hasActiveEnv = activeEnvName !== null
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [envDialogOpen, setEnvDialogOpen] = useState(false)
  const [cookiesOpen, setCookiesOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    clamp(readStoredSize(STORAGE_SIDEBAR, SIDEBAR_DEFAULT), SIDEBAR_MIN, SIDEBAR_MAX)
  )
  const [responseHeight, setResponseHeight] = useState(() =>
    Math.max(RESPONSE_MIN, readStoredSize(STORAGE_RESPONSE, RESPONSE_DEFAULT))
  )

  const sidebarWrapRef = useRef<HTMLDivElement>(null)
  const responseWrapRef = useRef<HTMLDivElement>(null)
  const sidebarWidthRef = useRef(sidebarWidth)
  const responseHeightRef = useRef(responseHeight)
  sidebarWidthRef.current = sidebarWidth
  responseHeightRef.current = responseHeight

  const applySidebarWidth = useCallback((width: number) => {
    if (sidebarWrapRef.current) sidebarWrapRef.current.style.width = `${width}px`
  }, [])

  const applyResponseHeight = useCallback((height: number) => {
    if (responseWrapRef.current) responseWrapRef.current.style.height = `${height}px`
  }, [])

  const getResponseMax = useCallback(() => window.innerHeight - 48 - 180, [])

  const commitSidebarWidth = useCallback((width: number) => {
    setSidebarWidth(width)
    storeSize(STORAGE_SIDEBAR, width)
  }, [])

  const commitResponseHeight = useCallback((height: number) => {
    setResponseHeight(height)
    storeSize(STORAGE_RESPONSE, height)
  }, [])

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar variant="dense">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            <Box
              component="img"
              src={APP_LOGO}
              alt="FluxAPI"
              sx={{ width: 28, height: 28, display: 'block' }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              FluxAPI
            </Typography>
          </Box>
          <Tooltip title="Manage environments & variables">
            <Chip
              icon={<PublicIcon sx={{ fontSize: '16px !important' }} />}
              label={activeEnvName || 'No Environment'}
              size="small"
              variant={hasActiveEnv ? 'filled' : 'outlined'}
              color={hasActiveEnv ? 'primary' : 'default'}
              onClick={() => setEnvDialogOpen(true)}
              sx={{ cursor: 'pointer', maxWidth: 180, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
            />
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Import">
            <IconButton color="inherit" onClick={() => setImportDialog(true)}>
              <ImportExportIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Code Snippet (cURL)">
            <IconButton color="inherit" onClick={() => setSnippetOpen(true)}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cookie jar">
            <IconButton color="inherit" onClick={() => setCookiesOpen(true)}>
              <CookiesIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle theme">
            <IconButton
              color="inherit"
              onClick={() => themeMode(currentTheme === 'light' ? 'dark' : 'light')}
            >
              {currentTheme === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="About">
            <IconButton color="inherit" onClick={() => setAboutOpen(true)}>
              <InfoOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          display: 'flex',
          width: '100%',
          mt: '48px',
          height: 'calc(100vh - 48px)',
          overflow: 'hidden'
        }}
      >
        <Box
          ref={sidebarWrapRef}
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            height: '100%',
            overflow: 'hidden',
            contain: 'layout style'
          }}
        >
          <Drawer
            variant="permanent"
            sx={{
              width: '100%',
              height: '100%',
              [`& .MuiDrawer-paper`]: {
                width: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                height: '100%',
                border: 'none'
              }
            }}
          >
            <List dense>
              {SIDEBAR_ITEMS.map((item) => (
                <ListItemButton
                  key={item.id}
                  selected={activeSidebar === item.id}
                  onClick={() => setActiveSidebar(item.id)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </List>
            <Divider />
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }} data-resize-panel>
              {activeSidebar === 'collections' && <CollectionsPanel />}
              {activeSidebar === 'history' && <HistoryPanel />}
              {activeSidebar === 'openapi' && <OpenApiPanel />}
              {activeSidebar === 'proto' && <ProtoPanel />}
            </Box>
          </Drawer>
        </Box>

        <ResizeHandle
          axis="x"
          min={SIDEBAR_MIN}
          max={SIDEBAR_MAX}
          getSize={() => sidebarWidthRef.current}
          onLiveResize={applySidebarWidth}
          onCommit={commitSidebarWidth}
        />

        <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0, contain: 'layout style' }} data-resize-panel>
            <MemoRequestBuilder />
          </Box>
          <ResizeHandle
            axis="y"
            min={RESPONSE_MIN}
            max={getResponseMax()}
            getSize={() => responseHeightRef.current}
            onLiveResize={applyResponseHeight}
            onCommit={commitResponseHeight}
          />
          <Box
            ref={responseWrapRef}
            data-resize-panel
            sx={{
              height: responseHeight,
              minHeight: RESPONSE_MIN,
              flexShrink: 0,
              overflow: 'hidden',
              borderTop: 1,
              borderColor: 'divider',
              contain: 'layout style'
            }}
          >
            <MemoResponsePanel />
          </Box>
        </Box>
      </Box>

      <EnvironmentsDialog open={envDialogOpen} onClose={() => setEnvDialogOpen(false)} />
      <CookiesDialog open={cookiesOpen} onClose={() => setCookiesOpen(false)} />
      <ImportDialog />
      <CurlSnippetDialog />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onShowAbout={() => setAboutOpen(true)}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </Box>
  )
}
