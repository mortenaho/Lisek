import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import pngToIco from 'png-to-ico'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const svg = path.join(root, 'resources/fluxapi-logo.svg')
const png512 = path.join(root, 'resources/fluxapi-logo.png')
const ico = path.join(root, 'resources/icon.ico')
const rendererDir = path.join(root, 'src/renderer')
const sizes = [16, 24, 32, 48, 64, 128, 256, 512]

const resvg = (size, out) => {
  execSync(
    `npx --yes @resvg/resvg-js-cli "${svg}" "${out}" --fit-width ${size} --fit-height ${size}`,
    { stdio: 'inherit', cwd: root }
  )
}

resvg(512, png512)

const tempPngs = []
for (const size of sizes.filter((s) => s <= 256)) {
  const out = path.join(root, `resources/.icon-${size}.png`)
  resvg(size, out)
  tempPngs.push(out)
}

const buf = await pngToIco(tempPngs)
fs.writeFileSync(ico, buf)
for (const file of tempPngs) fs.unlinkSync(file)

fs.copyFileSync(png512, path.join(rendererDir, 'fluxapi-logo.png'))
fs.copyFileSync(svg, path.join(rendererDir, 'fluxapi-logo.svg'))

console.log(`Wrote ${ico} (${buf.length} bytes, ${tempPngs.length} sizes)`)
