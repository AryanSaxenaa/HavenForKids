import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { ConvexError } from 'convex/values';

// Simple hash — Convex runs in V8, no Node crypto. We use a basic
// deterministic string hash for the PIN + salt. In production replace
// with a server Action that calls a real crypto library.
function hashPin(pin: string, salt: string): string {
    const str = `${salt}:${pin}:haven2024`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32-bit int
    }
    return hash.toString(36);
}

function generateFamilyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// ── Register a new child ─────────────────────────────────────────────────────
export const registerUser = mutation({
    args: {
        username: v.string(),
        displayName: v.string(),
        pin: v.string(),
    },
    handler: async (ctx, args) => {
        const username = args.username.trim().toLowerCase();
        const displayName = args.displayName.trim();
        const pin = args.pin.trim();

        if (username.length < 3 || username.length > 20) {
            throw new ConvexError('Username must be 3–20 characters.');
        }
        if (!/^[a-z0-9_]+$/.test(username)) {
            throw new ConvexError('Username can only contain letters, numbers and underscores.');
        }
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            throw new ConvexError('PIN must be exactly 4 digits.');
        }
        if (displayName.length < 1 || displayName.length > 20) {
            throw new ConvexError('Display name must be 1–20 characters.');
        }

        // Check username is unique
        const existing = await ctx.db
            .query('havenUsers')
            .withIndex('username', (q) => q.eq('username', username))
            .first();
        if (existing) {
            throw new ConvexError('That username is already taken. Try another!');
        }

        const salt = Math.random().toString(36).substring(2);
        const pinHash = hashPin(pin, salt);

        // Generate a unique family code for the parent
        let familyCode = generateFamilyCode();
        let codeExists = await ctx.db
            .query('havenUsers')
            .withIndex('familyCode', (q) => q.eq('familyCode', familyCode))
            .first();
        while (codeExists) {
            familyCode = generateFamilyCode();
            codeExists = await ctx.db
                .query('havenUsers')
                .withIndex('familyCode', (q) => q.eq('familyCode', familyCode))
                .first();
        }

        await ctx.db.insert('havenUsers', {
            username,
            displayName,
            pinHash,
            salt,
            familyCode,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            loginStreak: 1,
            loginAttempts: 0,
            lockedUntil: null,
        });

        return { success: true, familyCode, displayName };
    },
});

// ── Login ────────────────────────────────────────────────────────────────────
export const loginUser = mutation({
    args: {
        username: v.string(),
        pin: v.string(),
    },
    handler: async (ctx, args) => {
        const username = args.username.trim().toLowerCase();
        const pin = args.pin.trim();

        const user = await ctx.db
            .query('havenUsers')
            .withIndex('username', (q) => q.eq('username', username))
            .first();

        if (!user) {
            throw new ConvexError("We don't recognise that username. Check your spelling!");
        }

        // Lockout check
        if (user.lockedUntil && Date.now() < user.lockedUntil) {
            const secsLeft = Math.ceil((user.lockedUntil - Date.now()) / 1000);
            throw new ConvexError(`Too many tries! Please wait ${secsLeft} seconds.`);
        }

        const pinHash = hashPin(pin, user.salt);
        if (pinHash !== user.pinHash) {
            const attempts = (user.loginAttempts || 0) + 1;
            const lockedUntil = attempts >= 3 ? Date.now() + 30_000 : null; // 30s lockout after 3 attempts
            await ctx.db.patch(user._id, { loginAttempts: attempts, lockedUntil });
            if (lockedUntil) {
                throw new ConvexError("Too many wrong PINs! You're locked out for 30 seconds.");
            }
            throw new ConvexError("Wrong PIN! Check again.");
        }

        // Success — reset attempts, update streak
        const now = Date.now();
        const msPerDay = 86_400_000;
        const daysSinceLast = Math.floor((now - (user.lastLogin || 0)) / msPerDay);
        const newStreak = daysSinceLast === 1 ? (user.loginStreak || 0) + 1 : daysSinceLast === 0 ? (user.loginStreak || 1) : 1;

        await ctx.db.patch(user._id, {
            lastLogin: now,
            loginStreak: newStreak,
            loginAttempts: 0,
            lockedUntil: null,
        });

        return {
            success: true,
            username: user.username,
            displayName: user.displayName,
            familyCode: user.familyCode,
            loginStreak: newStreak,
            isFirstVisitToday: daysSinceLast >= 1,
        };
    },
});

// ── Validate family code (for parent dashboard) ──────────────────────────────
export const getUserByFamilyCode = query({
    args: { familyCode: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('havenUsers')
            .withIndex('familyCode', (q) => q.eq('familyCode', args.familyCode.toUpperCase()))
            .first();

        if (!user) return null;

        return {
            username: user.username,
            displayName: user.displayName,
            loginStreak: user.loginStreak,
            lastLogin: user.lastLogin,
        };
    },
});

// ── Check if username exists (for registration hints) ────────────────────────
export const checkUsername = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('havenUsers')
            .withIndex('username', (q) => q.eq('username', args.username.toLowerCase()))
            .first();
        return { taken: !!user };
    },
});
