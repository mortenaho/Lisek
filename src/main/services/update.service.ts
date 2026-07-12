import { Notification, app, shell } from 'electron'
import type { BrowserWindow } from 'electron'
import { getSettings } from '../db'
import { isNewerVersion, normalizeVersion } from '../../../shared/semver'
import type { UpdateCheckResult } from '../../../shared/types'

export const GITHUB_REPO = 'mortenaho/Lisek'
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`
const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

const CHECK_DELAY_MS = 4_000

let lastResult: UpdateCheckResult | null = null
let checkInFlight: Promise<UpdateCheckResult> | null = null

export function getLastUpdateCheckResult(): UpdateCheckResult | null {
  return lastResult
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (checkInFlight) return checkInFlight

  checkInFlight = (async () => {
    const currentVersion = app.getVersion()
    const checkedAt = Date.now()

    try {
      const response = await fetch(GITHUB_LATEST_API, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `Lisek/${currentVersion}`
        }
      })

      if (!response.ok) {
        const result: UpdateCheckResult = {
          updateAvailable: false,
          currentVersion,
          latestVersion: null,
          releaseUrl: RELEASES_URL,
          releaseNotes: null,
          checkedAt,
          error: `GitHub returned ${response.status}`
        }
        lastResult = result
        return result
      }

      const data = (await response.json()) as {
        tag_name?: string
        html_url?: string
        body?: string | null
        draft?: boolean
        prerelease?: boolean
      }

      if (data.draft || data.prerelease || !data.tag_name) {
        const result: UpdateCheckResult = {
          updateAvailable: false,
          currentVersion,
          latestVersion: data.tag_name ? normalizeVersion(data.tag_name) : null,
          releaseUrl: data.html_url || RELEASES_URL,
          releaseNotes: null,
          checkedAt
        }
        lastResult = result
        return result
      }

      const latestVersion = normalizeVersion(data.tag_name)
      const updateAvailable = isNewerVersion(latestVersion, currentVersion)
      const result: UpdateCheckResult = {
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseUrl: data.html_url || RELEASES_URL,
        releaseNotes: data.body?.trim() || null,
        checkedAt
      }
      lastResult = result
      return result
    } catch (err) {
      const result: UpdateCheckResult = {
        updateAvailable: false,
        currentVersion,
        latestVersion: null,
        releaseUrl: RELEASES_URL,
        releaseNotes: null,
        checkedAt,
        error: err instanceof Error ? err.message : 'Update check failed'
      }
      lastResult = result
      return result
    } finally {
      checkInFlight = null
    }
  })()

  return checkInFlight
}

function notifyOs(result: UpdateCheckResult): void {
  if (!result.updateAvailable || !result.latestVersion) return
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title: 'Lisek update available',
    body: `Version ${result.latestVersion} is ready to download (you have ${result.currentVersion}).`,
    silent: false
  })

  notification.on('click', () => {
    void shell.openExternal(result.releaseUrl || RELEASES_URL)
  })

  notification.show()
}

function pushToRenderer(win: BrowserWindow | null, result: UpdateCheckResult): void {
  if (!win || win.isDestroyed()) return
  if (!result.updateAvailable) return
  win.webContents.send('update:available', result)
}

export async function runStartupUpdateCheck(getMainWindow: () => BrowserWindow | null): Promise<void> {
  const settings = getSettings()
  if (settings.autoUpdate === false) return

  const win = getMainWindow()
  if (win && !win.isDestroyed() && win.webContents.isLoading()) {
    await new Promise<void>((resolve) => {
      win.webContents.once('did-finish-load', () => resolve())
      setTimeout(resolve, 15_000)
    })
  }

  await new Promise((resolve) => setTimeout(resolve, CHECK_DELAY_MS))

  const result = await checkForUpdates()
  if (!result.updateAvailable) return

  notifyOs(result)
  pushToRenderer(getMainWindow(), result)
}
