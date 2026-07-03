import { Box, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material'
import { useRequestEditor } from '../../contexts/RequestEditorContext'
import type { AuthType, OAuthGrantType } from '@shared/types'

export default function AuthTab() {
  const { request, patch } = useRequestEditor()
  const { authType, auth } = request

  const setAuth = (partial: Partial<typeof auth>) =>
    patch({ auth: { ...auth, ...partial } })

  return (
    <Box sx={{ maxWidth: 480 }}>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Auth Type</InputLabel>
        <Select
          value={authType}
          label="Auth Type"
          onChange={(e) => patch({ authType: e.target.value as AuthType })}
        >
          <MenuItem value="none">No Auth</MenuItem>
          <MenuItem value="bearer">Bearer Token</MenuItem>
          <MenuItem value="basic">Basic Auth</MenuItem>
          <MenuItem value="apikey">API Key</MenuItem>
          <MenuItem value="oauth2">OAuth 2.0</MenuItem>
        </Select>
      </FormControl>

      {authType === 'bearer' && (
        <TextField
          fullWidth
          size="small"
          label="Token"
          value={auth.bearerToken || ''}
          onChange={(e) => setAuth({ bearerToken: e.target.value })}
        />
      )}

      {authType === 'basic' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Username"
            value={auth.basicUsername || ''}
            onChange={(e) => setAuth({ basicUsername: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label="Password"
            type="password"
            value={auth.basicPassword || ''}
            onChange={(e) => setAuth({ basicPassword: e.target.value })}
          />
        </Box>
      )}

      {authType === 'apikey' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Key"
            value={auth.apiKeyKey || ''}
            onChange={(e) => setAuth({ apiKeyKey: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label="Value"
            value={auth.apiKeyValue || ''}
            onChange={(e) => setAuth({ apiKeyValue: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Add to</InputLabel>
            <Select
              value={auth.apiKeyIn || 'header'}
              label="Add to"
              onChange={(e) => setAuth({ apiKeyIn: e.target.value as 'header' | 'query' })}
            >
              <MenuItem value="header">Header</MenuItem>
              <MenuItem value="query">Query Params</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {authType === 'oauth2' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Grant Type</InputLabel>
            <Select
              value={auth.oauthGrantType || 'client_credentials'}
              label="Grant Type"
              onChange={(e) => setAuth({ oauthGrantType: e.target.value as OAuthGrantType })}
            >
              <MenuItem value="client_credentials">Client Credentials</MenuItem>
              <MenuItem value="password">Password</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="Token URL"
            placeholder="https://auth.example.com/oauth/token"
            value={auth.oauthTokenUrl || ''}
            onChange={(e) => setAuth({ oauthTokenUrl: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label="Client ID"
            value={auth.oauthClientId || ''}
            onChange={(e) => setAuth({ oauthClientId: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label="Client Secret"
            type="password"
            value={auth.oauthClientSecret || ''}
            onChange={(e) => setAuth({ oauthClientSecret: e.target.value })}
          />
          {auth.oauthGrantType === 'password' && (
            <>
              <TextField
                fullWidth
                size="small"
                label="Username"
                value={auth.oauthUsername || ''}
                onChange={(e) => setAuth({ oauthUsername: e.target.value })}
              />
              <TextField
                fullWidth
                size="small"
                label="Password"
                type="password"
                value={auth.oauthPassword || ''}
                onChange={(e) => setAuth({ oauthPassword: e.target.value })}
              />
            </>
          )}
          <TextField
            fullWidth
            size="small"
            label="Scope (optional)"
            value={auth.oauthScope || ''}
            onChange={(e) => setAuth({ oauthScope: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label="Access Token (optional override)"
            value={auth.oauthAccessToken || ''}
            onChange={(e) => setAuth({ oauthAccessToken: e.target.value })}
            helperText="If set, skips token request and uses this token directly"
          />
        </Box>
      )}
    </Box>
  )
}
