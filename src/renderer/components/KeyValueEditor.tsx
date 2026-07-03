import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Checkbox,
  Button,
  Tooltip,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { memo, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { KeyValue } from '@shared/types'

interface Props {
  items: KeyValue[]
  onChange: (items: KeyValue[]) => void
  keyLabel?: string
  valueLabel?: string
  allowFiles?: boolean
}

interface RowProps {
  item: KeyValue
  index: number
  allowFiles: boolean
  onFieldChange: (index: number, field: keyof KeyValue, value: string | boolean) => void
  onPickFile: (index: number) => void
  onRemove: (index: number) => void
}

const KeyValueRow = memo(function KeyValueRow({
  item,
  index,
  allowFiles,
  onFieldChange,
  onPickFile,
  onRemove
}: RowProps) {
  return (
    <TableRow>
      <TableCell padding="checkbox">
        <Checkbox
          checked={item.enabled}
          onChange={(e) => onFieldChange(index, 'enabled', e.target.checked)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          fullWidth
          variant="standard"
          value={item.key}
          onChange={(e) => onFieldChange(index, 'key', e.target.value)}
        />
      </TableCell>
      <TableCell>
        {allowFiles && item.filePath ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" noWrap sx={{ flex: 1, fontFamily: 'monospace' }}>
              {item.filePath.split(/[/\\]/).pop()}
            </Typography>
            <Tooltip title="Change file">
              <IconButton size="small" onClick={() => onPickFile(index)}>
                <AttachFileIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <TextField
            size="small"
            fullWidth
            variant="standard"
            value={item.value}
            onChange={(e) => onFieldChange(index, 'value', e.target.value)}
          />
        )}
      </TableCell>
      <TableCell>
        {allowFiles && (
          <Tooltip title="Attach file">
            <IconButton size="small" onClick={() => onPickFile(index)}>
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" onClick={() => onRemove(index)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  )
})

function KeyValueEditor({
  items,
  onChange,
  keyLabel = 'Key',
  valueLabel = 'Value',
  allowFiles = false
}: Props) {
  const onFieldChange = useCallback(
    (index: number, field: keyof KeyValue, value: string | boolean) => {
      onChange(items.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
    },
    [items, onChange]
  )

  const add = useCallback(
    () => onChange([...items, { id: uuidv4(), key: '', value: '', enabled: true }]),
    [items, onChange]
  )

  const remove = useCallback(
    (index: number) => onChange(items.filter((_, i) => i !== index)),
    [items, onChange]
  )

  const pickFile = useCallback(
    async (index: number) => {
      const filePath = await window.fluxAPI.dialog.openFile([{ name: 'All Files', extensions: ['*'] }])
      if (!filePath) return
      onChange(
        items.map((row, i) =>
          i === index ? { ...row, filePath, value: filePath.split(/[/\\]/).pop() || '' } : row
        )
      )
    },
    [items, onChange]
  )

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            <TableCell>{keyLabel}</TableCell>
            <TableCell>{valueLabel}</TableCell>
            <TableCell width={allowFiles ? 80 : 40} />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, i) => (
            <KeyValueRow
              key={item.id}
              item={item}
              index={i}
              allowFiles={allowFiles}
              onFieldChange={onFieldChange}
              onPickFile={pickFile}
              onRemove={remove}
            />
          ))}
        </TableBody>
      </Table>
      <Button size="small" startIcon={<AddIcon />} onClick={add} sx={{ mt: 1 }}>
        Add
      </Button>
    </Box>
  )
}

export default memo(KeyValueEditor)
