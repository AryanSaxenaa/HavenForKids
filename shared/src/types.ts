// shared/src/types.ts
// All shared types for HAVEN. Imported by both server and game.
// No runtime dependencies in this file.

export type Character = "Pip" | "Bramble" | "Flint" | "Luna" | "Cleo";
export type Tone = "playful" | "heavy" | "neutral";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  sessionId: string;
  character: Character;
  message: string;
  history: Message[];
}

export interface ChatResponse {
  message: string;
  crisis: boolean;
  tone: Tone;
}

export interface SessionCreateRequest {
  childName: string;
  age: number;
  preferredCharacter: Character;
  parentEmail?: string;
}

export interface SessionCreateResponse {
  sessionId: string;
}

export interface ConversationEndRequest {
  sessionId: string;
  character: Character;
  messageCount: number;
  tones: Tone[];
}

export interface CharacterVisit {
  character: Character;
  count: number;
  avgTone: number;
}

export interface WeeklyEntry {
  week: string;
  character: Character;
  count: number;
}

export interface DashboardData {
  characterVisits: CharacterVisit[];
  weeklyTrend: WeeklyEntry[];
  suggestion: string;
}
