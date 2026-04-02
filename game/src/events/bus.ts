import mitt from 'mitt'
import type { Character } from '../../../shared/src/types'

export type BusEvents = {
  'game:ready': undefined
  'onboarding:complete': { sessionId: string; preferredCharacter: Character }
  'conversation:close': undefined
  'crisis:trigger': undefined
}

export const bus = mitt<BusEvents>()
