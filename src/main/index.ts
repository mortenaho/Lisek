import { app, shell, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { initDatabase } from './db'
import { registerIpcHandlers } from './ipc'
import { seedFreshInstall } from './services/repository'
import { configureCookieJar } from './services/cookie-jar.service'
import { APP_INFO } from '../../shared/appInfo'

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

if (process.platform === 'win32') {
  app.setAppUserModelId('com.fluxapi.app')
}

// Installed build uses its own profile — not the dev `fluxapi` Electron folder.
if (app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'FluxAPI'))
}

function resolveAppIcon(): Electron.NativeImage | undefined {
  const candidates: string[] = []

  if (isDev) {
    candidates.push(
      join(process.cwd(), 'resources/icon.ico'),
      join(process.cwd(), 'resources/fluxapi-logo.png')
    )
  }

  candidates.push(
    join(process.resourcesPath, 'icon.ico'),
    join(process.resourcesPath, 'fluxapi-logo.png'),
    join(__dirname, '../../resources/icon.ico'),
    join(__dirname, '../../resources/fluxapi-logo.png'),
    join(__dirname, '../renderer/fluxapi-logo.png')
  )

  for (const path of candidates) {
    if (!existsSync(path)) continue
    const image = nativeImage.createFromPath(path)
    if (!image.isEmpty()) return image
  }

  return undefined
}

function createWindow(): void {
  const icon = resolveAppIcon()

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: `${APP_INFO.name} v${app.getVersion()}`,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (icon) mainWindow?.setIcon(icon)
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  const appIcon = resolveAppIcon()
  if (appIcon) {
    app.dock?.setIcon(appIcon)
  }

  const dbPath = join(app.getPath('userData'), 'fluxapi.db')
  configureCookieJar(join(app.getPath('userData'), 'cookies.json'))
  const { isNew } = await initDatabase(dbPath)
  if (isNew) {
    seedFreshInstall()
  }
  registerIpcHandlers(() => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
