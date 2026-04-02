import type { Character } from '../../../shared/src/types'

export interface CharacterDef {
  name: Character
  animal: string
  emotionalZone: string
  spriteKey: string
  color: number  // Phaser hex color for UI accents
}

export const CHARACTERS: CharacterDef[] = [
  { name: 'Pip',     animal: 'Fox',    emotionalZone: 'Anxiety / Worry',      spriteKey: 'pip',     color: 0xFF8C42 },
  { name: 'Bramble', animal: 'Bear',   emotionalZone: 'Sadness / Loss',        spriteKey: 'bramble', color: 0x6B8CBA },
  { name: 'Flint',   animal: 'Wolf',   emotionalZone: 'Anger / Frustration',   spriteKey: 'flint',   color: 0xC0392B },
  { name: 'Luna',    animal: 'Owl',    emotionalZone: 'Loneliness',            spriteKey: 'luna',    color: 0x9B59B6 },
  { name: 'Cleo',    animal: 'Rabbit', emotionalZone: 'Joy / Gratitude',       spriteKey: 'cleo',    color: 0xF1C40F },
]

export const CHARACTER_MAP: Record<Character, CharacterDef> = {
  Pip:     CHARACTERS[0]!,
  Bramble: CHARACTERS[1]!,
  Flint:   CHARACTERS[2]!,
  Luna:    CHARACTERS[3]!,
  Cleo:    CHARACTERS[4]!,
}
