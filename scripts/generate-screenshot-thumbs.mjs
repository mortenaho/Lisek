import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const shotsDir = path.join(root, 'docs/screenshots')
const thumbsDir = path.join(shotsDir, 'thumbs')

const names = [
  'collections',
  'get-request',
  'delete-request',
  'delete-response',
  'environments',
  'history'
]

fs.mkdirSync(thumbsDir, { recursive: true })

for (const name of names) {
  const src = path.join(shotsDir, `${name}.png`)
  if (!fs.existsSync(src)) {
    console.warn(`Skip missing screenshot: ${name}.png`)
    continue
  }
  const out = path.join(thumbsDir, `${name}.jpg`)
  await sharp(src)
    .resize(480, null, { withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(out)
  console.log(`Wrote ${path.relative(root, out)}`)
}
