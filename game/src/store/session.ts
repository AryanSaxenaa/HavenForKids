import type { Character } from '../../../shared/src/types'

export interface StoredSession {
  sessionId: string
  childName: string
  age: number
  preferredCharacter: Character
}

const SESSION_KEY = 'haven_session'

export function saveSession(session: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): StoredSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
