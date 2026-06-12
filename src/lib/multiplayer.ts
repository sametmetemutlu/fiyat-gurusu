import type { CategoryFilter, Listing } from "./game";

export const MP_SERVER_URL =
  process.env.NEXT_PUBLIC_MP_URL || "http://127.0.0.1:3001";

export type MpPhase = "LOBBY" | "ROUND_PLAYING" | "ROUND_REVEAL" | "GAME_OVER";
export type MpMode = "classic" | "higherlower";

export interface MpPlayer {
  id: string;
  name: string;
  roundWins: number;
  hasSubmitted: boolean;
  isHost: boolean;
  isYou: boolean;
  offline?: boolean;
}

const SESSION_KEY = "fg_mp_session";

export function saveMpSession(code: string, playerId: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ code, playerId }));
}

export function loadMpSession(): { code: string; playerId: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as { code: string; playerId: string }) : null;
  } catch {
    return null;
  }
}

export function clearMpSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function roomInviteUrl(code: string): string {
  if (typeof window === "undefined") return `/cok-oyunculu?oda=${code}`;
  return `${window.location.origin}/cok-oyunculu?oda=${code}`;
}

export interface MpConfig {
  mode: MpMode;
  category: CategoryFilter;
  rounds: number;
}

export interface ClassicRevealRow {
  playerId: string;
  name: string;
  guess: number | null;
  deviation: number;
  timedOut: boolean;
  rank: number;
}

export interface HlRevealRow {
  playerId: string;
  name: string;
  pick: 0 | 1 | null;
  correct: boolean;
  timedOut: boolean;
  rank: number;
}

export interface MpReveal {
  type: "classic" | "higherlower";
  realPrice?: number;
  prices?: [number, number];
  higherSide?: 0 | 1;
  roundWinnerId?: string | null;
  rankings: ClassicRevealRow[] | HlRevealRow[];
}

export interface MpFinalRow {
  playerId: string;
  name: string;
  roundWins: number;
  rank: number;
}

export interface RoomState {
  code: string;
  phase: MpPhase;
  isHost: boolean;
  config: MpConfig;
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  submittedCount: number;
  playerCount: number;
  totalSlots?: number;
  revealSeconds?: number;
  players: MpPlayer[];
  listing: Omit<Listing, "realPrice"> | null;
  pair: [Omit<Listing, "realPrice">, Omit<Listing, "realPrice">] | null;
  slider: { min: number; max: number; step: number } | null;
  reveal: MpReveal | null;
  finalRankings: MpFinalRow[] | null;
}

export const MP_MODE_LABELS: Record<MpMode, string> = {
  classic: "🎯 Klasik",
  higherlower: "⚖️ Hangisi Pahalı?",
};
