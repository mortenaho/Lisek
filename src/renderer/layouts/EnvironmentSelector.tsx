import { Box, Button } from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import PublicIcon from '@mui/icons-material/Public'

interface Props {
  activeEnvName: string | null
  onOpen: () => void
}

export default function EnvironmentSelector({ activeEnvName, onOpen }: Props) {
  const active = Boolean(activeEnvName)
  const label = activeEnvName || 'No Environment'

  return (
    <Button
      size="small"
      variant="text"
      onClick={onOpen}
      startIcon={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: -0.25 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: active ? '#4ade80' : 'rgba(255,255,255,0.35)',
              boxShadow: active ? '0 0 6px rgba(74, 222, 128, 0.75)' : 'none',
              flexShrink: 0
            }}
          />
          <PublicIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.85)' }} />
        </Box>
      }
      endIcon={<ArrowDropDownIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.85)' }} />}
      sx={{
        ml: 1,
        px: 1.5,
        py: 0.5,
        minHeight: 32,
        textTransform: 'none',
        fontWeight: 500,
        fontSize: 13,
        color: active ? '#ffffff' : 'rgba(255,255,255,0.75)',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.22)',
        bgcolor: 'rgba(0,0,0,0.22)',
        '& .MuiButton-startIcon': { mr: 0.75 },
        '&:hover': {
          bgcolor: 'rgba(0,0,0,0.32)',
          borderColor: 'rgba(255,255,255,0.35)',
          color: '#ffffff'
        }
      }}
    >
      {label}
    </Button>
  )
}
