// Builds the app icons from the Cave logo. Run: node scripts/make-icons.mjs <path-to-logo.png>
// The logo is 3000x1688 with the mark roughly centred; we take a square around it
// and set it on the app's charcoal so the white bar of the "e" stays visible.
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const src = process.argv[2]
if (!src) throw new Error('Pass the path to the logo PNG.')

const BG = '#171412'
const SQUARE = { left: 618, top: 0, width: 1688, height: 1688 }
const out = fileURLToPath(new URL('../public/', import.meta.url))
await mkdir(out, { recursive: true })

async function icon(name, size, logoShare) {
  const inner = Math.round(size * logoShare)
  const logo = await sharp(src).extract(SQUARE).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(`${out}${name}`)
  console.log('wrote', name)
}

await icon('icon-512.png', 512, 0.86)
await icon('icon-192.png', 192, 0.86)
await icon('icon-maskable-512.png', 512, 0.66) // extra margin: Android crops these to a circle
await icon('apple-touch-icon.png', 180, 0.84)
await icon('favicon.png', 64, 0.92)
