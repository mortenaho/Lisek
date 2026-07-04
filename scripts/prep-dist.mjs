import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectOutput = path.join(root, 'dist-installer')
const buildOutput = path.join(os.tmpdir(), 'lisek-dist')

if (process.platform === 'win32') {
  for (const name of ['Lisek', 'electron']) {
    try {
      execSync(`taskkill /F /IM ${name}.exe /T`, { stdio: 'ignore' })
    } catch {
      // not running
    }
  }
}

// Build in TEMP to avoid file locks from antivirus/indexers on project folders.
if (fs.existsSync(buildOutput)) {
  try {
    fs.rmSync(buildOutput, { recursive: true, force: true })
  } catch {
    console.warn('[prep-dist] Could not clean temp build folder')
  }
}

console.log(`[prep-dist] Build output: ${buildOutput}`)
