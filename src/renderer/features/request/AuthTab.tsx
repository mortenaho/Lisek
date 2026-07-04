import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Paper
} from '@mui/material'
import { useRequestEditor } from '../../contexts/RequestEditorContext'
import { COMPACT } from '../../theme/compact'
import { applyControlledInputChange } from '../../utils/inputSelection'
import type { AuthType, OAuthGrantType } from '@shared/types'

const AUTH_OPTIONS: { value: AuthType; label: string; hint: string }[] = [
  { value: 'none', label: 'None', hint: 'No authentication' },
  { value: 'bearer', label: 'Bearer', hint: 'Authorization: Bearer token' },
  { value: 'basic', label: 'Basic', hint: 'HTTP Basic username & password' },
  { value: 'apikey', label: 'API Key', hint: 'Custom header or query param' },
  { value: 'oauth2', label: 'OAuth 2', hint: 'Token endpoint flow' }
]

export default function AuthTab() {
  const { request, patch } = useRequestEditor()
  const { authType, auth } = request

  const setAuth = (partial: Partial<typeof auth>) =>
    patch({ auth: { ...auth, ...partial } })

  const selected = AUTH_OPTIONS.find((o) => o.value === authType)

  return (
    <Box sx={{ width: '100%', pt: 0.75 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={authType}
        onChange={(_, value: AuthType | null) => value && patch({ authType: value })}
        sx={{
          display: 'flex',
          width: '100%',
          flexWrap: 'wrap',
          gap: 0.25,
          mb: 1.25,
          '& .MuiToggleButtonGroup-grouped': {
            border: 1,
            borderColor: 'divider',
            borderRadius: '4px !important',
            mx: '0 !important',
            flex: '1 1 0',
            minWidth: 56,
            px: 0.75,
            py: 0.125,
            textTransform: 'none',
            fontSize: 10,
            fontWeight: 500
          }
        }}
      >
        {AUTH_OPTIONS.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {selected && authType !== 'none' && (
        <Paper variant="outlined" sx={{ overflow: 'hidden', width: '100%' }}>
          <Box sx={{ px: 1, py: 0.375, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{selected.label}</Typography>
            <Typography sx={COMPACT.caption}>{selected.hint}</Typography>
          </Box>

          <Box sx={{ pt: 1, px: 0.75, pb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.75, width: '100%' }}>
            {authType === 'bearer' && (
              <TextField
                fullWidth
                size="small"
                label="Bearer Token"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={auth.bearerToken || ''}
                onChange={(e) =>
                  applyControlledInputChange(e.target, auth.bearerToken || '', e.target.value, (v) =>
                    setAuth({ bearerToken: v })
                  )
                }
                sx={COMPACT.input}
                slotProps={{
                  input: { sx: COMPACT.monoInput },
                  inputLabel: { sx: { fontSize: 11 } }
                }}
              />
            )}

            {authType === 'basic' && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 0.75,
                  width: '100%'
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  label="Username"
                  value={auth.basicUsername || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.basicUsername || '', e.target.value, (v) =>
                      setAuth({ basicUsername: v })
                    )
                  }
                  sx={COMPACT.input}
                  slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Password"
                  type="password"
                  value={auth.basicPassword || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.basicPassword || '', e.target.value, (v) =>
                      setAuth({ basicPassword: v })
                    )
                  }
                  sx={COMPACT.input}
                  slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                />
              </Box>
            )}

            {authType === 'apikey' && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr auto' },
                  gap: 0.75,
                  width: '100%'
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  label="Key name"
                  placeholder="X-API-Key"
                  value={auth.apiKeyKey || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.apiKeyKey || '', e.target.value, (v) =>
                      setAuth({ apiKeyKey: v })
                    )
                  }
                  sx={COMPACT.input}
                  slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Key value"
                  value={auth.apiKeyValue || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.apiKeyValue || '', e.target.value, (v) =>
                      setAuth({ apiKeyValue: v })
                    )
                  }
                  sx={COMPACT.input}
                  slotProps={{
                    input: { sx: COMPACT.monoInput },
                    inputLabel: { sx: { fontSize: 11 } }
                  }}
                />
                <FormControl fullWidth size="small" sx={COMPACT.input}>
                  <InputLabel sx={{ fontSize: 11 }}>Add to</InputLabel>
                  <Select
                    value={auth.apiKeyIn || 'header'}
                    label="Add to"
                    onChange={(e) => setAuth({ apiKeyIn: e.target.value as 'header' | 'query' })}
                    sx={{ ...COMPACT.select, minWidth: 120 }}
                  >
                    <MenuItem value="header" sx={{ fontSize: 11 }}>Header</MenuItem>
                    <MenuItem value="query" sx={{ fontSize: 11 }}>Query Params</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {authType === 'oauth2' && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 0.75,
                  width: '100%'
                }}
              >
                <FormControl fullWidth size="small" sx={COMPACT.input}>
                  <InputLabel sx={{ fontSize: 11 }}>Grant Type</InputLabel>
                  <Select
                    value={auth.oauthGrantType || 'client_credentials'}
                    label="Grant Type"
                    onChange={(e) => setAuth({ oauthGrantType: e.target.value as OAuthGrantType })}
                    sx={COMPACT.select}
                  >
                    <MenuItem value="client_credentials" sx={{ fontSize: 11 }}>Client Credentials</MenuItem>
                    <MenuItem value="password" sx={{ fontSize: 11 }}>Password</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  size="small"
                  label="Token URL"
                  placeholder="https://auth.example.com/oauth/token"
                  value={auth.oauthTokenUrl || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.oauthTokenUrl || '', e.target.value, (v) =>
                      setAuth({ oauthTokenUrl: v })
                    )
                  }
                  sx={COMPACT.input}
                  slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                />
                <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                  <Divider />
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  label="Client ID"
                  value={auth.oauthClientId || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.oauthClientId || '', e.target.value, (v) =>
                      setAuth({ oauthClientId: v })
                    )
                  }
                  sx={COMPACT.input}
                  slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Client Secret"
                  type="password"
                  value={auth.oauthClientSecret || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.oauthClientSecret || '', e.target.value, (v) =>
                      setAuth({ oauthClientSecret: v })
                    )
                  }
                  sx={COMPACT.input}
                  slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                />
                {auth.oauthGrantType === 'password' && (
                  <>
                    <TextField
                      fullWidth
                      size="small"
                      label="Username"
                      value={auth.oauthUsername || ''}
                      onChange={(e) =>
                        applyControlledInputChange(e.target, auth.oauthUsername || '', e.target.value, (v) =>
                          setAuth({ oauthUsername: v })
                        )
                      }
                      sx={COMPACT.input}
                      slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Password"
                      type="password"
                      value={auth.oauthPassword || ''}
                      onChange={(e) =>
                        applyControlledInputChange(e.target, auth.oauthPassword || '', e.target.value, (v) =>
                          setAuth({ oauthPassword: v })
                        )
                      }
                      sx={COMPACT.input}
                      slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                    />
                  </>
                )}
                <TextField
                  fullWidth
                  size="small"
                  label="Scope (optional)"
                  placeholder="read write"
                  value={auth.oauthScope || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.oauthScope || '', e.target.value, (v) =>
                      setAuth({ oauthScope: v })
                    )
                  }
                  sx={COMPACT.input}
                  slotProps={{ inputLabel: { sx: { fontSize: 11 } } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Access Token override (optional)"
                  value={auth.oauthAccessToken || ''}
                  onChange={(e) =>
                    applyControlledInputChange(e.target, auth.oauthAccessToken || '', e.target.value, (v) =>
                      setAuth({ oauthAccessToken: v })
                    )
                  }
                  helperText="Skip token request and use this token directly"
                  sx={COMPACT.input}
                  slotProps={{
                    input: { sx: COMPACT.monoInput },
                    inputLabel: { sx: { fontSize: 11 } },
                    formHelperText: { sx: { fontSize: 10, m: 0, mt: 0.25 } }
                  }}
                />
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {authType === 'none' && (
        <Box
          sx={{
            py: 1.5,
            px: 1,
            width: '100%',
            textAlign: 'center',
            border: 1,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 0.75,
            bgcolor: 'action.hover'
          }}
        >
          <Typography sx={COMPACT.caption}>Sent without authentication headers</Typography>
        </Box>
      )}
    </Box>
  )
}
