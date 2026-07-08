import { readFileSync } from 'fs'
import { basename } from 'path'
import type {
  AuthConfig,
  AuthType,
  BodyType,
  HttpRequestPayload,
  HttpResponse,
  KeyValue
} from '../../../shared/types'
import { substituteKeyValues, substituteVariables } from './variable.service'
import { fetchOAuthToken } from './oauth.service'
import { cookiesToKeyValues } from './cookie-jar.service'
import { fetchWithCookieJar } from './http-fetch.service'

function buildUrl(baseUrl: string, params: KeyValue[]): string {
  const url = new URL(baseUrl)
  for (const p of params) {
    if (p.enabled && p.key) url.searchParams.set(p.key, p.value)
  }
  return url.toString()
}

async function applyAuth(
  headers: Record<string, string>,
  url: URL,
  authType: AuthType,
  auth: AuthConfig
): Promise<void> {
  if (authType === 'bearer' && auth.bearerToken) {
    headers['Authorization'] = `Bearer ${auth.bearerToken}`
  } else if (authType === 'basic' && auth.basicUsername) {
    const cred = Buffer.from(`${auth.basicUsername}:${auth.basicPassword || ''}`).toString('base64')
    headers['Authorization'] = `Basic ${cred}`
  } else if (authType === 'apikey' && auth.apiKeyKey && auth.apiKeyValue) {
    if (auth.apiKeyIn === 'query') {
      url.searchParams.set(auth.apiKeyKey, auth.apiKeyValue)
    } else {
      headers[auth.apiKeyKey] = auth.apiKeyValue
    }
  } else if (authType === 'oauth2') {
    const token = await fetchOAuthToken(auth)
    headers['Authorization'] = `Bearer ${token}`
  }
}

function buildBody(payload: HttpRequestPayload): { body?: BodyInit; headers: Record<string, string> } {
  const extraHeaders: Record<string, string> = {}

  if (payload.bodyType === 'none') return { headers: extraHeaders }

  if (payload.bodyType === 'raw') {
    if (payload.bodyRawContentType) {
      extraHeaders['Content-Type'] = payload.bodyRawContentType
    }
    return { body: payload.bodyRaw, headers: extraHeaders }
  }

  if (payload.bodyType === 'x-www-form-urlencoded') {
    const params = new URLSearchParams()
    for (const item of payload.urlEncoded) {
      if (item.enabled && item.key) params.set(item.key, item.value)
    }
    extraHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
    return { body: params.toString(), headers: extraHeaders }
  }

  if (payload.bodyType === 'form-data') {
    const form = new FormData()
    for (const item of payload.formData) {
      if (!item.enabled || !item.key) continue
      if (item.filePath) {
        const buffer = readFileSync(item.filePath)
        form.append(item.key, new Blob([buffer]), basename(item.filePath))
      } else {
        form.append(item.key, item.value)
      }
    }
    return { body: form, headers: extraHeaders }
  }

  return { headers: extraHeaders }
}

const abortControllers = new Map<string, AbortController>()

export async function sendHttpRequest(
  payload: HttpRequestPayload,
  envVars: KeyValue[] = [],
  collectionVars: KeyValue[] = [],
  options: { sslVerify?: boolean; timeoutMs?: number; followRedirects?: boolean; proxyUrl?: string } = {}
): Promise<HttpResponse> {
  const requestId = payload.requestId || 'default'
  const controller = new AbortController()
  abortControllers.set(requestId, controller)

  const timeoutMs = options.timeoutMs ?? 30000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const sslVerify = options.sslVerify !== false

  try {
    const urlStr = substituteVariables(payload.url, envVars, collectionVars)
    const params = substituteKeyValues(payload.params, envVars, collectionVars)
    const headersList = substituteKeyValues(
      payload.headers.filter((h) => h.enabled),
      envVars,
      collectionVars
    )

    const url = new URL(buildUrl(urlStr, params))
    const headers: Record<string, string> = {}
    for (const h of headersList) {
      if (h.key) headers[h.key] = h.value
    }

    const auth: AuthConfig = {
      bearerToken: payload.auth.bearerToken
        ? substituteVariables(payload.auth.bearerToken, envVars, collectionVars)
        : undefined,
      basicUsername: payload.auth.basicUsername
        ? substituteVariables(payload.auth.basicUsername, envVars, collectionVars)
        : undefined,
      basicPassword: payload.auth.basicPassword
        ? substituteVariables(payload.auth.basicPassword, envVars, collectionVars)
        : undefined,
      apiKeyKey: payload.auth.apiKeyKey,
      apiKeyValue: payload.auth.apiKeyValue
        ? substituteVariables(payload.auth.apiKeyValue, envVars, collectionVars)
        : undefined,
      apiKeyIn: payload.auth.apiKeyIn,
      oauthGrantType: payload.auth.oauthGrantType,
      oauthTokenUrl: payload.auth.oauthTokenUrl
        ? substituteVariables(payload.auth.oauthTokenUrl, envVars, collectionVars)
        : undefined,
      oauthClientId: payload.auth.oauthClientId
        ? substituteVariables(payload.auth.oauthClientId, envVars, collectionVars)
        : undefined,
      oauthClientSecret: payload.auth.oauthClientSecret
        ? substituteVariables(payload.auth.oauthClientSecret, envVars, collectionVars)
        : undefined,
      oauthUsername: payload.auth.oauthUsername
        ? substituteVariables(payload.auth.oauthUsername, envVars, collectionVars)
        : undefined,
      oauthPassword: payload.auth.oauthPassword
        ? substituteVariables(payload.auth.oauthPassword, envVars, collectionVars)
        : undefined,
      oauthScope: payload.auth.oauthScope,
      oauthAccessToken: payload.auth.oauthAccessToken
        ? substituteVariables(payload.auth.oauthAccessToken, envVars, collectionVars)
        : undefined
    }

    await applyAuth(headers, url, payload.authType, auth)

    const processedPayload = {
      ...payload,
      bodyRaw: substituteVariables(payload.bodyRaw, envVars, collectionVars),
      formData: substituteKeyValues(payload.formData, envVars, collectionVars),
      urlEncoded: substituteKeyValues(payload.urlEncoded, envVars, collectionVars)
    }

    const { body, headers: bodyHeaders } = buildBody(processedPayload)
    Object.assign(headers, bodyHeaders)

    const start = Date.now()
    const { response, storedCookies } = await fetchWithCookieJar(
      url.toString(),
      {
        method: payload.method,
        headers,
        body: body as BodyInit | undefined,
        signal: controller.signal
      },
      {
        sslVerify,
        followRedirects: options.followRedirects !== false,
        proxyUrl: options.proxyUrl
      }
    )

    const responseBody = await response.text()
    const durationMs = Date.now() - start
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    return {
      statusCode: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      durationMs,
      sizeBytes: new TextEncoder().encode(responseBody).length,
      cookies: cookiesToKeyValues(storedCookies)
    }
  } finally {
    clearTimeout(timeout)
    abortControllers.delete(requestId)
  }
}

export function cancelRequest(requestId: string): void {
  abortControllers.get(requestId)?.abort()
  abortControllers.delete(requestId)
}
