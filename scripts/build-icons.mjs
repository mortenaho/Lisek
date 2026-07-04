import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const png512 = path.join(root, 'resources/lisek-logo.png')
const ico = path.join(root, 'resources/icon.ico')
const rendererDir = path.join(root, 'src/renderer')
const sizes = [16, 24, 32, 48, 64, 128, 256, 512]

if (!fs.existsSync(png512)) {
  console.error('Missing resources/lisek-logo.png — run: node scripts/process-logo.mjs')
  process.exit(1)
}

const tempPngs = []
for (const size of sizes.filter((s) => s <= 256)) {
  const out = path.join(root, `resources/.icon-${size}.png`)
  await sharp(png512)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out)
  tempPngs.push(out)
}

const buf = await pngToIco(tempPngs)
fs.writeFileSync(ico, buf)
for (const file of tempPngs) fs.unlinkSync(file)

fs.copyFileSync(png512, path.join(rendererDir, 'lisek-logo.png'))

console.log(`Wrote ${ico} (${buf.length} bytes, ${tempPngs.length} sizes)`)
