import type { AuthConfig, OAuthGrantType } from '../../../shared/types'

export async function fetchOAuthToken(
  auth: AuthConfig,
  grantType: OAuthGrantType = auth.oauthGrantType || 'client_credentials'
): Promise<string> {
  if (auth.oauthAccessToken?.trim()) return auth.oauthAccessToken.trim()
  if (!auth.oauthTokenUrl) throw new Error('OAuth token URL is required')

  const body = new URLSearchParams()
  body.set('grant_type', grantType)

  if (grantType === 'client_credentials') {
    if (auth.oauthClientId) body.set('client_id', auth.oauthClientId)
    if (auth.oauthClientSecret) body.set('client_secret', auth.oauthClientSecret)
  } else if (grantType === 'password') {
    if (auth.oauthClientId) body.set('client_id', auth.oauthClientId)
    if (auth.oauthClientSecret) body.set('client_secret', auth.oauthClientSecret)
    if (auth.oauthUsername) body.set('username', auth.oauthUsername)
    if (auth.oauthPassword) body.set('password', auth.oauthPassword)
  }

  if (auth.oauthScope) body.set('scope', auth.oauthScope)

  const response = await fetch(auth.oauthTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  const json = (await response.json()) as { access_token?: string; error?: string; error_description?: string }
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `OAuth token request failed (${response.status})`)
  }
  return json.access_token
}
