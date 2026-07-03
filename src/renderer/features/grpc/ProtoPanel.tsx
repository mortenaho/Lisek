import { Box, Button, List, ListItemText, ListItem, IconButton, Typography } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteIcon from '@mui/icons-material/Delete'
import { useAppStore } from '../../stores/appStore'

export default function ProtoPanel() {
  const protoFiles = useAppStore((s) => s.protoFiles)
  const loadProtoFiles = useAppStore((s) => s.loadProtoFiles)

  const importProto = async () => {
    const path = await window.fluxAPI.dialog.openFile([{ name: 'Proto', extensions: ['proto'] }])
    if (path) {
      await window.fluxAPI.proto.import(path)
      await loadProtoFiles()
    }
  }

  const deleteProto = async (id: string) => {
    await window.fluxAPI.proto.delete(id)
    await loadProtoFiles()
  }

  return (
    <Box>
      <Button size="small" startIcon={<UploadFileIcon />} onClick={importProto} sx={{ mb: 1 }}>
        Import .proto
      </Button>
      <List dense>
        {protoFiles.map((p) => (
          <ListItem
            key={p.id}
            secondaryAction={
              <IconButton size="small" onClick={() => deleteProto(p.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemText primary={p.name} secondary={p.filePath} />
          </ListItem>
        ))}
        {protoFiles.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No proto files
          </Typography>
        )}
      </List>
    </Box>
  )
}
