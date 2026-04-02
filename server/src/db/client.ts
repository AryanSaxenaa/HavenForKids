import { createClient, type Client } from '@libsql/client'
import { env } from '../config/env'

let _db: Client | null = null

export function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    })
  }
  return _db
}

// Proxy so callers import `db` directly without worrying about initialisation order.
// We must bind the real client as `this` on every method access — otherwise methods
// that internally call `this.something` would receive the empty proxy target instead.
export const db = new Proxy({} as Client, {
  get(_target, prop) {
    const client = getDb()
    const value = client[prop as keyof Client]
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})
