import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Menu,
  MenuItem,
  ListItemIcon,
  Chip,
  Tooltip,
  Divider
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import FolderIcon from '@mui/icons-material/Folder'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import HttpIcon from '@mui/icons-material/Http'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import TuneIcon from '@mui/icons-material/Tune'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import ConfirmDialog from '../../components/ConfirmDialog'
import PromptDialog from '../../components/PromptDialog'
import CollectionVariablesDialog from './CollectionVariablesDialog'
import CollectionRunnerDialog from './CollectionRunnerDialog'
import type { CollectionModel, RequestModel } from '@shared/types'

const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7'
}

type ContextTarget =
  | { type: 'collection'; item: CollectionModel }
  | { type: 'request'; item: RequestModel }

type DeleteTarget =
  | { type: 'collection'; id: string; name: string }
  | { type: 'request'; id: string; name: string }

function MethodBadge({ method }: { method: string }) {
  return (
    <Chip
      label={method}
      size="small"
      sx={{
        height: 18,
        fontSize: 10,
        fontWeight: 700,
        bgcolor: METHOD_COLORS[method] || '#999',
        color: '#fff',
        mr: 0.75,
        minWidth: 44
      }}
    />
  )
}

function ItemActions({
  target,
  onRename,
  onDuplicate,
  onDelete,
  onTogglePin,
  onOpenMenu
}: {
  target: ContextTarget
  onRename: (type: 'collection' | 'request', id: string, name: string) => void
  onDuplicate: (req: RequestModel) => void
  onDelete: (target: DeleteTarget) => void
  onTogglePin: (target: ContextTarget) => void
  onOpenMenu: (e: React.MouseEvent<HTMLElement>, target: ContextTarget) => void
}) {
  const pinned = target.item.pinned

  return (
    <Box
      className="tree-actions"
      sx={{ display: 'flex', opacity: 0, transition: 'opacity 0.15s', ml: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip title={pinned ? 'Unpin' : 'Pin'}>
        <IconButton
          size="small"
          color={pinned ? 'primary' : 'default'}
          onClick={() => onTogglePin(target)}
        >
          {pinned ? (
            <PushPinIcon sx={{ fontSize: 16 }} />
          ) : (
            <PushPinOutlinedIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Tooltip>
      <Tooltip title="Rename">
        <IconButton
          size="small"
          onClick={() => onRename(target.type, target.item.id, target.item.name)}
        >
          <DriveFileRenameOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      {target.type === 'request' && (
        <Tooltip title="Duplicate">
          <IconButton size="small" onClick={() => onDuplicate(target.item)}>
            <ContentCopyIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Delete">
        <IconButton
          size="small"
          onClick={() =>
            onDelete({
              type: target.type,
              id: target.item.id,
              name: target.item.name
            })
          }
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} color="error" />
        </IconButton>
      </Tooltip>
      <IconButton size="small" onClick={(e) => onOpenMenu(e, target)}>
        <MoreVertIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  )
}

const comparePinnedSortOrder = <T extends { pinned: boolean; sortOrder: number }>(a: T, b: T) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return a.sortOrder - b.sortOrder
}

export default function CollectionsPanel() {
  const collections = useAppStore((s) => s.collections)
  const requests = useAppStore((s) => s.requests)
  const activeRequestId = useAppStore((s) => s.activeRequest?.id ?? null)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const selectRequest = useAppStore((s) => s.selectRequest)
  const updateActiveRequest = useAppStore((s) => s.updateActiveRequest)
  const createCollection = useAppStore((s) => s.createCollection)
  const deleteCollection = useAppStore((s) => s.deleteCollection)
  const renameCollection = useAppStore((s) => s.renameCollection)
  const createRequest = useAppStore((s) => s.createRequest)
  const deleteRequest = useAppStore((s) => s.deleteRequest)
  const setCollectionPinned = useAppStore((s) => s.setCollectionPinned)
  const setRequestPinned = useAppStore((s) => s.setRequestPinned)
  const loadRequests = useAppStore((s) => s.loadRequests)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<{ type: 'collection' | 'request'; id: string; value: string } | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number; target: ContextTarget } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)
  const [variablesCollection, setVariablesCollection] = useState<CollectionModel | null>(null)
  const [runnerCollection, setRunnerCollection] = useState<CollectionModel | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) editInputRef.current?.focus()
  }, [editing])

  const rootCollections = useMemo(
    () => collections.filter((c) => !c.parentId).sort(comparePinnedSortOrder),
    [collections]
  )

  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests
    const q = searchQuery.toLowerCase()
    return requests.filter(
      (r) => r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q)
    )
  }, [requests, searchQuery])

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: e[id] === false }))

  const startRename = (type: 'collection' | 'request', id: string, name: string) => {
    setMenuAnchor(null)
    setEditing({ type, id, value: name })
  }

  const commitRename = async () => {
    if (!editing || !editing.value.trim()) {
      setEditing(null)
      return
    }
    const name = editing.value.trim()
    if (editing.type === 'collection') {
      await renameCollection(editing.id, name)
    } else {
      const req = requests.find((r) => r.id === editing.id)
      if (req) {
        const updated = { ...req, name }
        await window.fluxAPI.requests.save(updated)
        if (activeRequestId === editing.id) updateActiveRequest({ name })
        await loadRequests()
      }
    }
    setEditing(null)
  }

  const togglePin = async (target: ContextTarget) => {
    setMenuAnchor(null)
    if (target.type === 'collection') {
      await setCollectionPinned(target.item.id, !target.item.pinned)
    } else {
      await setRequestPinned(target.item.id, !target.item.pinned)
    }
  }

  const duplicateRequest = async (req: RequestModel) => {
    setMenuAnchor(null)
    const copy = await window.fluxAPI.requests.save({
      ...req,
      id: undefined,
      name: `${req.name} (Copy)`,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    void selectRequest(copy)
    await loadRequests()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'collection') {
      await deleteCollection(deleteTarget.id)
    } else {
      await deleteRequest(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  const openMenu = (e: React.MouseEvent<HTMLElement>, target: ContextTarget) => {
    e.stopPropagation()
    e.preventDefault()
    setMenuAnchor({ top: e.clientY, left: e.clientX, target })
  }

  const closeMenu = () => setMenuAnchor(null)

  const handleCreateCollection = async (name: string) => {
    await createCollection(name)
    setNewCollectionOpen(false)
  }

  const exportCollection = async (collectionId: string, format: 'postman' | 'openapi') => {
    setMenuAnchor(null)
    const col = collections.find((c) => c.id === collectionId)
    const safeName = (col?.name || 'collection').replace(/[^\w.-]+/g, '_')
    const filePath = await window.fluxAPI.dialog.saveFile(`${safeName}.json`, [
      { name: 'JSON', extensions: ['json'] },
      { name: 'YAML', extensions: ['yaml', 'yml'] }
    ])
    if (!filePath) return
    if (format === 'postman') {
      await window.fluxAPI.export.postman(collectionId, filePath)
    } else {
      await window.fluxAPI.export.openapi(collectionId, filePath)
    }
  }

  const renderRequest = (req: RequestModel, depth: number) => {
    const isActive = activeRequestId === req.id
    const isEditing = editing?.type === 'request' && editing.id === req.id

    return (
      <ListItemButton
        key={req.id}
        selected={isActive}
        sx={{
          pl: 1.5 + depth * 1.5,
          py: 0.5,
          borderRadius: 1,
          mx: 0.5,
          bgcolor: req.pinned ? 'action.hover' : undefined,
          '&:hover .tree-actions': { opacity: 1 }
        }}
        onClick={() => !isEditing && void selectRequest(req)}
        onDoubleClick={() => startRename('request', req.id, req.name)}
      >
        {req.pinned && (
          <PushPinIcon
            sx={{ fontSize: 12, mr: 0.5, color: 'primary.main', transform: 'rotate(45deg)' }}
          />
        )}
        <MethodBadge method={req.method} />
        {isEditing ? (
          <TextField
            inputRef={editInputRef}
            size="small"
            fullWidth
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditing(null)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <Tooltip
            title={
              <Box>
                <Typography variant="caption" component="div" fontWeight={600}>
                  {req.name}
                </Typography>
                <Typography variant="caption" component="div" color="inherit" sx={{ opacity: 0.85 }}>
                  {req.method}
                  {req.url ? ` · ${req.url}` : req.protocol !== 'http' ? ` · ${req.protocol}` : ''}
                </Typography>
              </Box>
            }
            placement="right"
            enterDelay={500}
          >
            <ListItemText
              primary={req.name}
              primaryTypographyProps={{
                variant: 'caption',
                noWrap: true,
                fontWeight: isActive ? 600 : 400,
                sx: { fontSize: 11, lineHeight: 1.3 }
              }}
              sx={{ flex: 1, minWidth: 0, my: 0 }}
            />
          </Tooltip>
        )}
        {!isEditing && (
          <ItemActions
            target={{ type: 'request', item: req }}
            onRename={startRename}
            onDuplicate={duplicateRequest}
            onDelete={setDeleteTarget}
            onTogglePin={togglePin}
            onOpenMenu={openMenu}
          />
        )}
      </ListItemButton>
    )
  }

  const renderCollection = (col: CollectionModel, depth = 0) => {
    const children = collections.filter((c) => c.parentId === col.id).sort(comparePinnedSortOrder)
    const colRequests = filteredRequests.filter((r) => r.collectionId === col.id).sort(comparePinnedSortOrder)
    const isOpen = expanded[col.id] !== false
    const isEditing = editing?.type === 'collection' && editing.id === col.id

    return (
      <Box key={col.id}>
        <ListItemButton
          sx={{
            pl: 0.5 + depth * 1.5,
            py: 0.5,
            borderRadius: 1,
            mx: 0.5,
            bgcolor: col.pinned ? 'action.hover' : undefined,
            '&:hover .tree-actions': { opacity: 1 }
          }}
          onClick={() => !isEditing && toggle(col.id)}
          onDoubleClick={() => startRename('collection', col.id, col.name)}
        >
          {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          {col.pinned ? (
            <PushPinIcon sx={{ fontSize: 14, mr: 0.5, color: 'primary.main', transform: 'rotate(45deg)' }} />
          ) : (
            <FolderIcon sx={{ fontSize: 16, mr: 0.75, opacity: 0.7 }} />
          )}
          {isEditing ? (
            <TextField
              inputRef={editInputRef}
              size="small"
              fullWidth
              value={editing.value}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setEditing(null)
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <ListItemText
              primary={col.name}
              secondary={`${colRequests.length} request${colRequests.length !== 1 ? 's' : ''}`}
              primaryTypographyProps={{ variant: 'body2', noWrap: true, fontWeight: 500 }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          )}
          {!isEditing && (
            <ItemActions
              target={{ type: 'collection', item: col }}
              onRename={startRename}
              onDuplicate={duplicateRequest}
              onDelete={setDeleteTarget}
              onTogglePin={togglePin}
              onOpenMenu={openMenu}
            />
          )}
        </ListItemButton>
        <Collapse in={isOpen}>
          {children.map((c) => renderCollection(c, depth + 1))}
          {colRequests.map((req) => renderRequest(req, depth + 1))}
        </Collapse>
      </Box>
    )
  }

  const uncategorized = filteredRequests.filter((r) => !r.collectionId).sort(comparePinnedSortOrder)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <Button
          size="small"
          variant="outlined"
          fullWidth
          startIcon={<AddIcon />}
          onClick={() => setNewCollectionOpen(true)}
        >
          Collection
        </Button>
        <Button size="small" variant="contained" fullWidth startIcon={<AddIcon />} onClick={() => createRequest()}>
          Request
        </Button>
      </Box>
      <TextField
        size="small"
        fullWidth
        placeholder="Search requests..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 1 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, mb: 0.5 }}>
        Double-click to rename · Right-click menu via ⋮
      </Typography>
      <List dense disablePadding sx={{ flex: 1, overflow: 'auto' }}>
        {rootCollections.length === 0 && uncategorized.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No collections yet. Create one to get started.
          </Typography>
        )}
        {rootCollections.map((c) => renderCollection(c))}
        {uncategorized.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" sx={{ px: 1, color: 'text.secondary', fontWeight: 600 }}>
              Uncategorized
            </Typography>
            {uncategorized.map((req) => renderRequest(req, 0))}
          </>
        )}
      </List>

      <Menu
        anchorReference="anchorPosition"
        anchorPosition={
          menuAnchor ? { top: menuAnchor.top, left: menuAnchor.left } : undefined
        }
        open={!!menuAnchor}
        onClose={closeMenu}
      >
        {menuAnchor?.target.type === 'collection' && (
          <>
            <MenuItem onClick={() => createRequest(menuAnchor.target.item.id)}>
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              New Request in folder
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null)
                setVariablesCollection(menuAnchor.target.item as CollectionModel)
              }}
            >
              <ListItemIcon>
                <TuneIcon fontSize="small" />
              </ListItemIcon>
              Collection Variables
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null)
                setRunnerCollection(menuAnchor.target.item as CollectionModel)
              }}
            >
              <ListItemIcon>
                <PlayArrowIcon fontSize="small" />
              </ListItemIcon>
              Run Collection
            </MenuItem>
            <MenuItem onClick={() => void exportCollection(menuAnchor.target.item.id, 'postman')}>
              <ListItemIcon>
                <FileDownloadIcon fontSize="small" />
              </ListItemIcon>
              Export as Postman
            </MenuItem>
            <MenuItem onClick={() => void exportCollection(menuAnchor.target.item.id, 'openapi')}>
              <ListItemIcon>
                <FileDownloadIcon fontSize="small" />
              </ListItemIcon>
              Export as OpenAPI
            </MenuItem>
          </>
        )}
        <MenuItem
          onClick={() => menuAnchor && void togglePin(menuAnchor.target)}
        >
          <ListItemIcon>
            {menuAnchor?.target.item.pinned ? (
              <PushPinOutlinedIcon fontSize="small" />
            ) : (
              <PushPinIcon fontSize="small" />
            )}
          </ListItemIcon>
          {menuAnchor?.target.item.pinned ? 'Unpin' : 'Pin'}
        </MenuItem>
        <MenuItem
          onClick={() =>
            menuAnchor &&
            startRename(
              menuAnchor.target.type,
              menuAnchor.target.item.id,
              menuAnchor.target.item.name
            )
          }
        >
          <ListItemIcon>
            <DriveFileRenameOutlineIcon fontSize="small" />
          </ListItemIcon>
          Rename
        </MenuItem>
        {menuAnchor?.target.type === 'request' && (
          <MenuItem onClick={() => duplicateRequest(menuAnchor.target.item as RequestModel)}>
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            Duplicate
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (!menuAnchor) return
            setDeleteTarget({
              type: menuAnchor.target.type,
              id: menuAnchor.target.item.id,
              name: menuAnchor.target.item.name
            })
            setMenuAnchor(null)
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      <PromptDialog
        open={newCollectionOpen}
        title="New Collection"
        label="Collection name"
        defaultValue=""
        confirmLabel="Create"
        onConfirm={(name) => void handleCreateCollection(name)}
        onCancel={() => setNewCollectionOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.type === 'collection' ? 'Delete Collection' : 'Delete Request'}
        message={
          deleteTarget?.type === 'collection'
            ? `Delete "${deleteTarget.name}" and all nested folders and requests? This cannot be undone.`
            : `Delete request "${deleteTarget?.name}"? This cannot be undone.`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <CollectionVariablesDialog
        open={!!variablesCollection}
        collection={variablesCollection}
        onClose={() => setVariablesCollection(null)}
      />

      <CollectionRunnerDialog
        open={!!runnerCollection}
        collection={runnerCollection}
        onClose={() => setRunnerCollection(null)}
      />
    </Box>
  )
}
