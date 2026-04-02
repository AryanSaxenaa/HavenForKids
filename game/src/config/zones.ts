import type { Character } from '../../../shared/src/types'

export interface Zone {
  character: Character
  x: number
  y: number
  width: number
  height: number
  spriteX: number
  spriteY: number
}

export const CHARACTER_ZONES: Zone[] = [
  { character: 'Pip',     x: 140, y: 120, width: 120, height: 120, spriteX: 200, spriteY: 180 },
  { character: 'Bramble', x: 700, y: 120, width: 120, height: 120, spriteX: 760, spriteY: 180 },
  { character: 'Flint',   x: 420, y: 80,  width: 120, height: 120, spriteX: 480, spriteY: 140 },
  { character: 'Luna',    x: 700, y: 400, width: 120, height: 120, spriteX: 760, spriteY: 460 },
  { character: 'Cleo',    x: 140, y: 400, width: 120, height: 120, spriteX: 200, spriteY: 460 },
]

export const START_POSITIONS: Record<Character, { x: number; y: number }> = {
  Pip:     { x: 200, y: 180 },
  Bramble: { x: 760, y: 180 },
  Flint:   { x: 480, y: 140 },
  Luna:    { x: 760, y: 460 },
  Cleo:    { x: 200, y: 460 },
}
