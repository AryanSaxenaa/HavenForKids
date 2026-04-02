/**
 * setup-assets.mjs
 * Copies and processes real Kenney CC0 assets into game/public/assets/
 *
 * Sources:
 *   kenney_animal-pack-redux/  — character PNGs
 *   kenney_tiny-town/          — village background tilemap + player tile
 *   kenney_ui-pack/            — UI elements
 *
 * Run: node scripts/setup-assets.mjs
 */

import sharp from 'sharp'
import { copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const ANIMALS   = join(ROOT, 'kenney_animal-pack-redux', 'PNG', 'Round')
const TINY_TOWN = join(ROOT, 'kenney_tiny-town')
const UI_PACK   = join(ROOT, 'kenney_ui-pack', 'PNG', 'Grey', 'Default')
const OUT_BG      = join(ROOT, 'game', 'public', 'assets', 'bg')
const OUT_SPRITES = join(ROOT, 'game', 'public', 'assets', 'sprites')
const OUT_UI      = join(ROOT, 'game', 'public', 'assets', 'ui')
const OUT_AUDIO   = join(ROOT, 'game', 'public', 'assets', 'audio')

// Ensure output dirs exist
for (const d of [OUT_BG, OUT_SPRITES, OUT_UI, OUT_AUDIO]) {
  mkdirSync(d, { recursive: true })
}

// ── Helpers ────────────────────────────────────────────────────────
async function resizeAndSave(src, dest, width, height) {
  await sharp(src)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest)
  console.log(`✅  ${dest.replace(ROOT, '')}`)
}

/**
 * Build a 2-frame horizontal spritesheet from one source image.
 * Frame 1 = original, Frame 2 = flipped horizontally (idle wiggle illusion).
 */
async function makeTwoFrameSheet(src, dest, frameSize = 48) {
  const frame = await sharp(src)
    .resize(frameSize, frameSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const flipped = await sharp(frame).flop().png().toBuffer()

  await sharp({
    create: { width: frameSize * 2, height: frameSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: frame,   left: 0,         top: 0 },
      { input: flipped, left: frameSize,  top: 0 },
    ])
    .png()
    .toFile(dest)

  console.log(`✅  ${dest.replace(ROOT, '')}`)
}

/**
 * Build a 5-row × 3-column player spritesheet (60×48 output at 16px frames).
 * Row 0: walk-down, Row 1: walk-left, Row 2: walk-right, Row 3: walk-up, Row 4: idle
 * We only have one top-down tile so all frames are the same tile — tinted per row.
 */
async function makePlayerSheet(src, dest) {
  const FRAME = 16
  const COLS  = 3
  const ROWS  = 5
  const W     = FRAME * COLS
  const H     = FRAME * ROWS

  const base = await sharp(src)
    .resize(FRAME, FRAME, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  // Create tinted variants for each direction
  const tints = [
    { r: 80,  g: 120, b: 200 }, // down  (blue)
    { r: 80,  g: 120, b: 200 }, // left
    { r: 80,  g: 120, b: 200 }, // right
    { r: 80,  g: 120, b: 200 }, // up
    { r: 80,  g: 120, b: 200 }, // idle
  ]

  const composites = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      // Slight horizontal offset per frame to make walking feel animated
      const offsetX = col === 1 ? -1 : col === 2 ? 1 : 0
      const buf = await sharp(base)
        .extend({ top: 0, bottom: 0, left: Math.max(0, offsetX), right: Math.max(0, -offsetX), background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize(FRAME, FRAME, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .tint(tints[row])
        .png()
        .toBuffer()
      composites.push({ input: buf, left: col * FRAME, top: row * FRAME })
    }
  }

  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toFile(dest)

  console.log(`✅  ${dest.replace(ROOT, '')}`)
}

// ── 1. Village background ──────────────────────────────────────────
// Use the packed tilemap as the village background, scaled to 960×640
await resizeAndSave(
  join(TINY_TOWN, 'Tilemap', 'tilemap_packed.png'),
  join(OUT_BG, 'village.png'),
  960, 640,
)

// ── 2. Player spritesheet ──────────────────────────────────────────
// Use tile_0084 (top-down person) as player base
const playerTile = join(TINY_TOWN, 'Tiles', 'tile_0084.png')
await makePlayerSheet(playerTile, join(OUT_SPRITES, 'player.png'))

// ── 3. Character spritesheets (2-frame idle) ───────────────────────
const characterMap = [
  // HAVEN name → Kenney animal PNG (best match)
  { name: 'pip',     src: join(ANIMALS, 'dog.png')    },  // no fox — dog is closest warm/curious
  { name: 'bramble', src: join(ANIMALS, 'bear.png')   },
  { name: 'flint',   src: join(ANIMALS, 'horse.png')  },  // no wolf — horse is strong/direct
  { name: 'luna',    src: join(ANIMALS, 'owl.png')    },
  { name: 'cleo',    src: join(ANIMALS, 'rabbit.png') },
]

for (const c of characterMap) {
  await makeTwoFrameSheet(c.src, join(OUT_SPRITES, `${c.name}.png`), 48)
}

// ── 4. Speech bubble ──────────────────────────────────────────────
// Use the round button border as a speech bubble indicator
await resizeAndSave(
  join(UI_PACK, 'button_round_border.png'),
  join(OUT_UI, 'speech-bubble.png'),
  48, 48,
)

// ── 5. Panel NinePatch background ────────────────────────────────
// Use the rectangle border button at a larger size as the panel background
await resizeAndSave(
  join(UI_PACK, 'button_rectangle_border.png'),
  join(OUT_UI, 'panel-ninepatch.png'),
  200, 200,
)

// ── 6. Audio placeholders ─────────────────────────────────────────
// Audio files cannot be generated from these packs — copy the UI click sounds
// from kenney_ui-pack/Sounds/ as stand-ins for chat-open and step
const SOUNDS_SRC = join(ROOT, 'kenney_ui-pack', 'Sounds')
const AUDIO_FILES = [
  { src: 'click-a.ogg',  dest: 'chat-open.ogg' },
  { src: 'tap-a.ogg',    dest: 'step.ogg' },
]
for (const f of AUDIO_FILES) {
  try {
    copyFileSync(join(SOUNDS_SRC, f.src), join(OUT_AUDIO, f.dest))
    console.log(`✅  /game/public/assets/audio/${f.dest}`)
  } catch {
    console.warn(`⚠️  Could not copy ${f.src}`)
  }
}
console.log(`ℹ️   village-ambient.mp3 — add a CC0 ambient loop from freesound.org`)

console.log('\n🎨  All real Kenney assets installed.')
console.log('NOTE: Audio uses .ogg — update BootScene.ts preload paths if needed.')
