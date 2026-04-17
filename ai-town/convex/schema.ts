import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { agentTables } from './agent/schema';
import { aiTownTables } from './aiTown/schema';
import { conversationId, playerId } from './aiTown/ids';
import { engineTables } from './engine/schema';

export default defineSchema({
  music: defineTable({
    storageId: v.string(),
    type: v.union(v.literal('background'), v.literal('player')),
  }),

  messages: defineTable({
    conversationId,
    messageUuid: v.string(),
    author: playerId,
    text: v.string(),
    worldId: v.optional(v.id('worlds')),
  })
    .index('conversationId', ['worldId', 'conversationId'])
    .index('messageUuid', ['conversationId', 'messageUuid']),

  // ── HAVEN user accounts ────────────────────────────────────────────────────
  havenUsers: defineTable({
    username: v.string(),       // e.g. "starfish99" — unique, lowercase
    displayName: v.string(),    // e.g. "Alice" — shown in-game
    pinHash: v.string(),        // deterministic hash of PIN + salt
    salt: v.string(),           // per-user salt for the PIN hash
    familyCode: v.string(),     // 6-char code given to parent — unique
    createdAt: v.number(),
    lastLogin: v.number(),
    loginStreak: v.number(),    // consecutive daily login streak
    loginAttempts: v.number(),  // wrong PINs since last success
    lockedUntil: v.union(v.number(), v.null()), // timestamp of lockout expiry
  })
    .index('username', ['username'])
    .index('familyCode', ['familyCode']),

  ...agentTables,
  ...aiTownTables,
  ...engineTables,
});
