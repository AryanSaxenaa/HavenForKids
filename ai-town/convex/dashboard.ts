import { v } from 'convex/values';
import { query } from './_generated/server';

// -----------------------------------------------------------------------
// Lightweight keyword-based sentiment scoring (no LLM needed).
// Returns a score from 1 (very negative) to 5 (very positive).
// We scan all the child's messages from a conversation and average.
// -----------------------------------------------------------------------
const NEGATIVE_WORDS = [
    'sad', 'scared', 'afraid', 'angry', 'mad', 'upset', 'cry', 'crying',
    'hate', 'hurt', 'pain', 'bad', 'terrible', 'awful', 'horrible', 'worst',
    'lonely', 'alone', 'bullied', 'bully', 'mean', 'hit', 'punch', 'punched',
    'kicked', 'pushed', 'shoved', 'yelled', 'screamed', 'scare', 'worry',
    'worried', 'anxious', 'nervous', 'sick', 'tired', 'don\'t want', 'can\'t',
    'won\'t', 'never', 'nobody', 'no one', 'nothing', 'not good', 'not okay',
    'not fine', 'unhappy', 'miserable', 'depressed', 'hopeless', 'helpless',
    'confused', 'lost', 'broken', 'stupid', 'dumb', 'ugly', 'fat', 'weak',
];

const POSITIVE_WORDS = [
    'happy', 'glad', 'good', 'great', 'awesome', 'amazing', 'fun', 'love',
    'like', 'enjoy', 'nice', 'kind', 'friend', 'friends', 'thank', 'thanks',
    'better', 'best', 'okay', 'fine', 'cool', 'yes', 'yeah', 'yay', 'excited',
    'wonderful', 'fantastic', 'beautiful', 'smile', 'laugh', 'safe', 'brave',
    'strong', 'proud', 'hope', 'hopeful', 'calm', 'relax', 'comfortable',
];

function computeSentimentScore(texts: string[]): number {
    if (texts.length === 0) return 3; // neutral default
    let negCount = 0;
    let posCount = 0;
    const combined = texts.join(' ').toLowerCase();
    for (const w of NEGATIVE_WORDS) {
        if (combined.includes(w)) negCount++;
    }
    for (const w of POSITIVE_WORDS) {
        if (combined.includes(w)) posCount++;
    }
    const total = negCount + posCount;
    if (total === 0) return 3; // neutral
    // Map ratio to 1-5 scale: all negative → 1, all positive → 5
    const ratio = posCount / total;
    return Math.max(1, Math.min(5, Math.round(1 + ratio * 4)));
}

// Keywords / phrases that indicate the child might be in distress.
// We match against lowercased message text with `includes()`.
// Keep phrases SHORT so partial matches work (e.g. "punched me" matches
// "bret punched me in face").
const DISTRESS_KEYWORDS = [
    // Self-harm / suicidal ideation
    'hurt myself', 'kill myself', 'want to die', 'hate myself',
    'end my life', 'i want to disappear', 'don\'t want to be alive',
    'don\'t want to live', 'cut myself', 'harm myself',

    // Isolation / loneliness
    'nobody cares', 'no one cares', 'no one loves', 'nobody loves',
    'nobody likes me', 'no one likes me', 'have no friends', 'no friends',
    'feel alone', 'feel lonely', 'all alone', 'left out',

    // Sadness / emotional distress
    'very sad', 'really sad', 'so sad', 'feel sad',
    'want to cry', 'been crying', 'feel bad',
    'feel scared', 'really scared', 'so scared', 'scared',
    'worried', 'feel worried', 'anxious', 'feel anxious', 'nervous',

    // Bullying — physical
    'punched me', 'hit me', 'kicked me', 'pushed me', 'shoved me',
    'slapped me', 'beat me', 'choked me', 'threw me', 'hurt me',
    'punched', 'hitting me', 'beating me', 'fights me',

    // Bullying — verbal / social
    'being bullied', 'bully me', 'bullies me', 'calls me names',
    'make fun of me', 'making fun of me', 'laughed at me', 'laugh at me',
    'pick on me', 'picks on me', 'mean to me', 'are mean', 'is mean',
    'threatens me', 'threatened me', 'intimidate',
    'spread rumors', 'spreads rumors', 'talk behind my back',

    // School avoidance
    'don\'t want to go school', 'don\'t want to go to school',
    'hate school', 'scared of school', 'afraid of school',
    'skip school', 'not going to school', 'refuse to go to school',

    // Abuse
    'abuse', 'abused', 'abuses me', 'touches me', 'inappropriate',
    'hurts me at home', 'yells at me', 'screams at me',

    // Running away
    'run away', 'running away', 'leave home', 'want to escape',
];

export const getDashboardData = query({
    args: {
        // Now accepts username (always stable) from the lookup in useDashboardData
        childName: v.string(),
        // Optional: also accept the username explicitly (new path)
        username: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Try to find via username first (stable ID from havenUsers)
        const usernameToSearch = args.username ?? null;

        let playerDescriptions: any[] = [];

        // Strategy 1: if username provided, look it up in havenUsers to get displayName,
        // then search playerDescriptions by that displayName
        if (usernameToSearch) {
            const havenUser = await ctx.db
                .query('havenUsers')
                .withIndex('username', (q) => q.eq('username', usernameToSearch.toLowerCase()))
                .first();

            if (havenUser) {
                // Try by displayName
                playerDescriptions = await ctx.db
                    .query('playerDescriptions')
                    .filter((q) => q.eq(q.field('name'), havenUser.displayName))
                    .collect();

                // Fallback: try by username (in case player joined with username not displayName)
                if (playerDescriptions.length === 0) {
                    playerDescriptions = await ctx.db
                        .query('playerDescriptions')
                        .filter((q) => q.eq(q.field('name'), havenUser.username))
                        .collect();
                }
            }
        }

        // Strategy 2: fallback — search by childName directly (original behaviour)
        if (playerDescriptions.length === 0) {
            playerDescriptions = await ctx.db
                .query('playerDescriptions')
                .filter((q) => q.eq(q.field('name'), args.childName))
                .collect();
        }

        // Strategy 3: case-insensitive fallback — scan all and match loosely
        if (playerDescriptions.length === 0) {
            const allDescs = await ctx.db.query('playerDescriptions').collect();
            const target = args.childName.toLowerCase();
            playerDescriptions = allDescs.filter(
                (d) => d.name?.toLowerCase() === target
            );
        }

        if (playerDescriptions.length === 0) {
            return null;
        }

        const playerId = playerDescriptions[0].playerId;
        const worldId = playerDescriptions[0].worldId;

        // 2. Aggregate conversations (characterVisits and weeklyTrend)
        const participations = await ctx.db
            .query('participatedTogether')
            .withIndex('playerHistory', (q) => q.eq('worldId', worldId).eq('player1', playerId))
            .collect();

        const visitCounts: Record<string, number> = {};
        const toneAvgs: Record<string, { total: number; count: number }> = {};
        const weeklyTrends: Record<string, Record<string, number>> = {};
        let lastActiveTimestamp = 0;

        // 3. Distress scan — scan all messages from this player for concerning keywords
        const allPlayerMessages = await ctx.db
            .query('messages')
            .filter((q) => q.eq(q.field('author'), playerId))
            .collect();

        const distressFlags: string[] = [];
        for (const msg of allPlayerMessages) {
            const lower = msg.text.toLowerCase();
            for (const keyword of DISTRESS_KEYWORDS) {
                if (lower.includes(keyword) && !distressFlags.includes(keyword)) {
                    distressFlags.push(keyword);
                }
            }
            if (msg._creationTime > lastActiveTimestamp) {
                lastActiveTimestamp = msg._creationTime;
            }
        }

        for (const p of participations) {
            const otherPlayerId = p.player2;
            const otherDesc = await ctx.db
                .query('playerDescriptions')
                .withIndex('worldId', (q) => q.eq('worldId', worldId).eq('playerId', otherPlayerId))
                .first();
            const otherName = otherDesc?.name || 'Unknown';

            const conv = await ctx.db
                .query('archivedConversations')
                .withIndex('worldId', (q) => q.eq('worldId', worldId).eq('id', p.conversationId))
                .first();

            if (conv && conv.numMessages > 0) {
                visitCounts[otherName] = (visitCounts[otherName] || 0) + 1;
                toneAvgs[otherName] = toneAvgs[otherName] || { total: 0, count: 0 };

                // Compute a real sentiment score for this conversation.
                // Pull the child's messages and score them.
                const convMessages = await ctx.db
                    .query('messages')
                    .filter((q) =>
                        q.and(
                            q.eq(q.field('author'), playerId),
                            q.eq(q.field('conversationId'), p.conversationId),
                        ),
                    )
                    .collect();
                const sentimentScore = computeSentimentScore(convMessages.map((m) => m.text));
                toneAvgs[otherName].total += sentimentScore;
                toneAvgs[otherName].count += 1;

                const date = new Date(conv.created);
                const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay()).toISOString().split('T')[0];

                weeklyTrends[startOfWeek] = weeklyTrends[startOfWeek] || {};
                weeklyTrends[startOfWeek][otherName] = (weeklyTrends[startOfWeek][otherName] || 0) + 1;

                // Track last active from conversation end time
                if (conv.ended > lastActiveTimestamp) {
                    lastActiveTimestamp = conv.ended;
                }
            }
        }

        // Build characterVisits array
        const characterVisits = Object.entries(visitCounts).map(([name, count]) => ({
            character: name as any,
            count,
            avgTone: toneAvgs[name].total / toneAvgs[name].count,
        }));

        // Build weeklyTrend array
        const weeklyTrend: any[] = [];
        Object.entries(weeklyTrends).forEach(([week, counts]) => {
            Object.entries(counts).forEach(([char, count]) => {
                weeklyTrend.push({ week, character: char, count });
            });
        });

        // 4. Suggestion text — based on actual sentiment and distress flags
        let suggestion = "No insights yet — your child hasn't chatted with a companion yet.";
        if (characterVisits.length > 0) {
            const favouriteCompanion = [...characterVisits].sort((a, b) => b.count - a.count)[0];
            const overallAvgTone =
                characterVisits.reduce((s, c) => s + c.avgTone, 0) / characterVisits.length;

            if (distressFlags.length > 0) {
                suggestion = `Your child may be going through a difficult time. During conversations with companions, they mentioned topics that could indicate distress (such as ${distressFlags.slice(0, 3).map(f => `"${f}"`).join(', ')}). Consider having a gentle conversation with them about how they're feeling.`;
            } else if (overallAvgTone <= 2) {
                suggestion = `Your child's recent conversations suggest they may be feeling down. They've talked most with ${favouriteCompanion.character}. It might be a good time to check in with them and see how they're doing.`;
            } else if (overallAvgTone <= 3) {
                suggestion = `Your child has been chatting with companions in HAVEN. Their mood seems mixed — they may be working through some feelings. They enjoy talking with ${favouriteCompanion.character} most. Keep encouraging them to visit!`;
            } else {
                suggestion = `Your child seems to be doing well! They enjoy talking with ${favouriteCompanion.character} most and their conversations have a positive tone. Keep encouraging them to visit HAVEN regularly!`;
            }
        }

        return {
            characterVisits,
            weeklyTrend,
            suggestion,
            distressFlags,
            lastActive: lastActiveTimestamp || null,
            totalMessages: allPlayerMessages.length,
        };
    },
});
