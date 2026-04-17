export const ACTION_TIMEOUT = 120_000; // more time for local dev
// export const ACTION_TIMEOUT = 60_000;// normally fine

export const IDLE_WORLD_TIMEOUT = 1 * 60 * 1000;
export const WORLD_HEARTBEAT_INTERVAL = 60 * 1000;

export const MAX_STEP = 10 * 60 * 1000;
export const TICK = 16;
export const STEP_INTERVAL = 1000;

export const PATHFINDING_TIMEOUT = 60 * 1000;
export const PATHFINDING_BACKOFF = 1000;
export const CONVERSATION_DISTANCE = 1.3;
export const MIDPOINT_THRESHOLD = 4;
export const TYPING_TIMEOUT = 15 * 1000;
export const COLLISION_THRESHOLD = 0.75;

// How many human players can be in a world at once.
export const MAX_HUMAN_PLAYERS = 8;

// Don't talk to anyone for 15s after having a conversation.
export const CONVERSATION_COOLDOWN = 15000;

// Don't do another activity for 10s after doing one.
export const ACTIVITY_COOLDOWN = 10_000;

// Don't talk to a player within 60s of talking to them.
export const PLAYER_CONVERSATION_COOLDOWN = 60000;

// Invite 80% of invites that come from other agents.
export const INVITE_ACCEPT_PROBABILITY = 0.8;

// Wait for 1m for invites to be accepted.
export const INVITE_TIMEOUT = 60000;

// Wait for another player to say something before jumping in.
// For HAVEN: give the child plenty of time to type — 3 minutes of silence before agent speaks first.
export const AWKWARD_CONVERSATION_TIMEOUT = 3 * 60_000;

// Leave a conversation after participating too long.
// For HAVEN: allow up to 20 minutes if talking to a human child.
export const MAX_CONVERSATION_DURATION = 20 * 60_000;

// Leave a conversation if it has more than N messages (only applies to agent-agent convo).
// For HAVEN: unlimited messages with human (handled in agent.ts), 12 between agents.
export const MAX_CONVERSATION_MESSAGES = 12;

// HAVEN — How often (ms) a companion tries to proactively check in on the human player.
// Each agent picks a random offset so they don't all arrive at the same time.
export const HAVEN_CHECKIN_INTERVAL = 2 * 60_000; // 2 minutes base
export const HAVEN_CHECKIN_JITTER = 60_000;      // +0-60 seconds random jitter per agent

// Wait for 1s after sending an input to the engine. We can remove this
// once we can await on an input being processed.
export const INPUT_DELAY = 1000;

// How many memories to get from the agent's memory.
// This is over-fetched by 10x so we can prioritize memories by more than relevance.
export const NUM_MEMORIES_TO_SEARCH = 3;

// Wait for at least two seconds before sending another message.
export const MESSAGE_COOLDOWN = 2000;

// Don't run a turn of the agent more than once a second.
export const AGENT_WAKEUP_THRESHOLD = 1000;

// How old we let memories be before we vacuum them
export const VACUUM_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000;
export const DELETE_BATCH_SIZE = 64;

// HAVEN: Give children plenty of time — 5 minutes of zero input before idle-kick.
// (Only fires if the child is NOT in an active conversation — see player.ts tick.)
export const HUMAN_IDLE_TOO_LONG = 5 * 60 * 1000;

export const ACTIVITIES = [
  { description: 'playing with butterflies', emoji: '🦋', duration: 60_000 },
  { description: 'looking at the clouds', emoji: '☁️', duration: 60_000 },
  { description: 'tending to the flowers', emoji: '🌸', duration: 60_000 },
  { description: 'humming a little tune', emoji: '🎵', duration: 60_000 },
  { description: 'skipping around the path', emoji: '🌈', duration: 45_000 },
  { description: 'watching the waterfall', emoji: '💧', duration: 60_000 },
];

export const ENGINE_ACTION_DURATION = 30000;

// Bound the number of pathfinding searches we do per game step.
export const MAX_PATHFINDS_PER_STEP = 16;

export const DEFAULT_NAME = 'Me';
