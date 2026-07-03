import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { rcedit } from 'rcedit'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

if (process.platform !== 'win32') {
  process.exit(0)
}

const electronExe = path.join(root, 'node_modules/electron/dist/electron.exe')
const icon = path.join(root, 'resources/icon.ico')

if (!existsSync(electronExe)) {
  console.warn('[brand-electron] electron.exe not found, skipping')
  process.exit(0)
}

if (!existsSync(icon)) {
  console.warn('[brand-electron] resources/icon.ico not found — run npm run icons first')
  process.exit(0)
}

await rcedit(electronExe, {
  icon,
  'version-string': {
    CompanyName: 'Seyyed Morteza Hosseini',
    FileDescription: 'FluxAPI',
    ProductName: 'FluxAPI',
    InternalName: 'FluxAPI',
    OriginalFilename: 'FluxAPI.exe'
  }
})

console.log('[brand-electron] Applied FluxAPI icon to electron.exe')
