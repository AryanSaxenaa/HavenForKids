/**
 * generate-placeholder-assets.mjs
 * Generates minimal valid PNG placeholder assets for HAVEN.
 * Run: node scripts/generate-placeholder-assets.mjs
 *
 * All assets are replaced by real Kenney CC0 pngs before production.
 * This script uses only Node built-ins (no npm deps).
 */

import { createWriteStream, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', 'game', 'public', 'assets')

// ── Minimal PNG writer ─────────────────────────────────────────────
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBuf, data])
  const crc = crc32(crcInput)
  const out = Buffer.alloc(4 + 4 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  typeBuf.copy(out, 4)
  data.copy(out, 8)
  out.writeUInt32BE(crc, 8 + data.length)
  return out
}

function makePng(width, height, pixels) {
  // pixels: array of {r,g,b,a} length = width*height, row-major
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Build raw scanlines (filter byte 0 + RGBA per pixel)
  const rawRows = []
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4)
    row[0] = 0 // filter: None
    for (let x = 0; x < width; x++) {
      const p = pixels[y * width + x]
      row[1 + x * 4 + 0] = p.r
      row[1 + x * 4 + 1] = p.g
      row[1 + x * 4 + 2] = p.b
      row[1 + x * 4 + 3] = p.a
    }
    rawRows.push(row)
  }
  const rawData = Buffer.concat(rawRows)
  const compressed = zlib.deflateSync(rawData)

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Pixel helpers ─────────────────────────────────────────────────
function solid(w, h, r, g, b, a = 255) {
  return Array(w * h).fill({ r, g, b, a })
}

function spritesheet(frameW, frameH, cols, rows, bgColor, fgColor) {
  const w = frameW * cols
  const h = frameH * rows
  const pixels = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Draw a simple figure: filled circle in center of each frame
      const fx = x % frameW
      const fy = y % frameH
      const cx = frameW / 2, cy = frameH / 2
      const dist = Math.sqrt((fx - cx) ** 2 + (fy - cy) ** 2)
      if (dist < frameW * 0.35) {
        pixels.push(fgColor)
      } else {
        pixels.push(bgColor)
      }
    }
  }
  return { w, h, pixels }
}

function writePng(relPath, pngBuf) {
  const full = join(ROOT, relPath)
  mkdirSync(dirname(full), { recursive: true })
  const ws = createWriteStream(full)
  ws.write(pngBuf)
  ws.end()
  console.log('✅ Written:', relPath)
}

// ── Generate assets ────────────────────────────────────────────────

// village background — 960×640, soft green/blue pixel art feel
;(function() {
  const w = 960, h = 640
  const pixels = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Simple gradient: sky top, grass bottom
      if (y < h * 0.4) {
        pixels.push({ r: 135, g: 206, b: 235, a: 255 }) // sky blue
      } else if (y < h * 0.45) {
        pixels.push({ r: 100, g: 180, b: 80, a: 255 })  // horizon
      } else {
        // Checkerboard grass pattern
        const tile = Math.floor(x / 32) + Math.floor(y / 32)
        if (tile % 2 === 0) {
          pixels.push({ r: 72, g: 160, b: 60, a: 255 })
        } else {
          pixels.push({ r: 80, g: 170, b: 66, a: 255 })
        }
      }
    }
  }
  writePng('bg/village.png', makePng(w, h, pixels))
})()

// Player spritesheet — 16×16, 4 rows (down/left/right/up) × 3 frames + idle
;(function() {
  const { w, h, pixels } = spritesheet(16, 16, 3, 5,
    { r: 0, g: 0, b: 0, a: 0 },
    { r: 80, g: 120, b: 200, a: 255 }
  )
  writePng('sprites/player.png', makePng(w, h, pixels))
})()

// Character spritesheets — 16×16, 2 frames wide, 1 row
const characters = [
  { key: 'pip',     fg: { r: 255, g: 140, b: 66, a: 255 } },   // fox orange
  { key: 'bramble', fg: { r: 107, g: 140, b: 186, a: 255 } },  // bear blue
  { key: 'flint',   fg: { r: 192, g: 57, b: 43, a: 255 } },    // wolf red
  { key: 'luna',    fg: { r: 155, g: 89, b: 182, a: 255 } },   // owl purple
  { key: 'cleo',    fg: { r: 241, g: 196, b: 15, a: 255 } },   // rabbit yellow
]
for (const c of characters) {
  const { w, h, pixels } = spritesheet(16, 16, 2, 1,
    { r: 0, g: 0, b: 0, a: 0 },
    c.fg
  )
  writePng(`sprites/${c.key}.png`, makePng(w, h, pixels))
}

// Speech bubble — 32×32
;(function() {
  const w = 32, h = 32
  const pixels = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = w / 2, cy = h / 2
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist < 13) {
        pixels.push({ r: 255, g: 255, b: 255, a: 230 })
      } else if (dist < 15) {
        pixels.push({ r: 180, g: 160, b: 220, a: 255 })
      } else {
        pixels.push({ r: 0, g: 0, b: 0, a: 0 })
      }
    }
  }
  writePng('ui/speech-bubble.png', makePng(w, h, pixels))
})()

// Chat panel NinePatch background — 48×48
;(function() {
  const w = 48, h = 48
  const pixels = solid(w, h, 255, 248, 240, 255)
  // Draw border
  for (let i = 0; i < w; i++) {
    pixels[i] = { r: 124, g: 106, b: 245, a: 255 }
    pixels[(h - 1) * w + i] = { r: 124, g: 106, b: 245, a: 255 }
  }
  for (let j = 0; j < h; j++) {
    pixels[j * w] = { r: 124, g: 106, b: 245, a: 255 }
    pixels[j * w + w - 1] = { r: 124, g: 106, b: 245, a: 255 }
  }
  writePng('ui/panel-ninepatch.png', makePng(w, h, pixels))
})()

console.log('\n🎨 All placeholder assets generated.')
console.log('Replace with real Kenney CC0 assets before production:')
console.log('  https://kenney.nl/assets/tiny-town')
console.log('  https://kenney.nl/assets/animal-pack-redux')
