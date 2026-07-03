import type { HttpResponse } from '@shared/types'

export function formatFullResponseText(response: HttpResponse): string {
  const headerLines = Object.entries(response.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  const cookieLines = response.cookies
    .map((cookie) => (cookie.value ? `${cookie.key}=${cookie.value}` : cookie.key))
    .join('\n')

  const sections = [
    `Status: ${response.statusCode} ${response.statusText}`,
    `Duration: ${response.durationMs} ms`,
    `Size: ${response.sizeBytes.toLocaleString()} B`,
    '',
    '--- Headers ---',
    headerLines || '(none)'
  ]

  if (response.cookies.length > 0) {
    sections.push('', '--- Cookies ---', cookieLines)
  }

  sections.push('', '--- Body ---', response.body)
  return sections.join('\n')
}

export function serializeFullResponse(response: HttpResponse): string {
  return JSON.stringify(response, null, 2)
}

export function defaultResponseDownloadName(response: HttpResponse): string {
  return `response-${response.statusCode}.json`
}
