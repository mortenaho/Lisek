import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultSource = path.join(root, 'resources/logo-source.png')

const input = process.argv[2] ?? defaultSource
if (!fs.existsSync(input)) {
  console.error(`Logo source not found: ${input}`)
  process.exit(1)
}

const outPng = path.join(root, 'resources/lisek-logo.png')
const docsPng = path.join(root, 'docs/assets/logo.png')

function isBackground(r, g, b, a) {
  if (a < 8) return true

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const spread = max - min

  if (min >= 235 && max >= 245) return true
  if (spread <= 18 && min >= 170 && max <= 245) return true

  return false
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

for (let i = 0; i < data.length; i += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  const a = data[i + 3]
  if (isBackground(r, g, b, a)) {
    data[i + 3] = 0
  }
}

const trimmed = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 }
})
  .trim({ threshold: 1 })
  .png()
  .toBuffer()

const png512 = await sharp(trimmed)
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

fs.writeFileSync(outPng, png512)
fs.copyFileSync(outPng, docsPng)

console.log(`Wrote transparent logo: ${outPng} (${png512.length} bytes)`)
