import type { CategoryFilter, Listing } from "./game";
import { GAME_PATH } from "./paths";

export const MP_SERVER_URL =
  process.env.NEXT_PUBLIC_MP_URL || "http://127.0.0.1:3001";

export type MpPhase = "LOBBY" | "ROUND_PLAYING" | "ROUND_REVEAL" | "GAME_OVER";
export type MpMode = "classic" | "higherlower";
export type MpRole = "player" | "display";

export interface MpPlayer {
  id: string;
  name: string;
  totalScore: number;
  hasSubmitted: boolean;
  isHost: boolean;
  isYou: boolean;
  offline?: boolean;
}

const SESSION_KEY = "fg_mp_session";
const DISPLAY_SESSION_KEY = "fg_mp_display";

export type MpSession = { code: string; playerId: string; secret: string };
export type DisplaySession = { code: string; secret: string };

export function saveMpSession(code: string, playerId: string, secret: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ code, playerId, secret }));
}

export function loadMpSession(): MpSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<MpSession>;
    if (!data.code || !data.playerId || !data.secret) return null;
    return { code: data.code, playerId: data.playerId, secret: data.secret };
  } catch {
    return null;
  }
}

export function clearMpSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function roomInviteUrl(code: string): string {
  const path = `${GAME_PATH}/cok-oyunculu?oda=${code}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function saveDisplaySession(code: string, secret: string) {
  localStorage.setItem(DISPLAY_SESSION_KEY, JSON.stringify({ code, secret }));
}

export function loadDisplaySession(): DisplaySession | null {
  try {
    const raw = localStorage.getItem(DISPLAY_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<DisplaySession>;
    if (!data.code || !data.secret) return null;
    return { code: data.code, secret: data.secret };
  } catch {
    return null;
  }
}

/** Canlı sitede çok oyunculu adresi şifreli olmalı. Yerel geliştirme http kalabilir. */
export function mpBlockedReason(): string | null {
  if (typeof window === "undefined") return null;
  let url: URL;
  try {
    url = new URL(MP_SERVER_URL);
  } catch {
    return "Çok oyunculu sunucu adresi geçersiz";
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "https:") return null;
  if (local && window.location.protocol !== "https:") return null;
  return "Çok oyunculu sunucu adresi şifreli (https) olmalı";
}

export function clearDisplaySession() {
  localStorage.removeItem(DISPLAY_SESSION_KEY);
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
  points: number;
  speedBonus: number;
  tierCode: string;
  tierLabel: string;
  timedOut: boolean;
  rank: number;
}

export interface HlRevealRow {
  playerId: string;
  name: string;
  pick: 0 | 1 | null;
  correct: boolean;
  points: number;
  speedBonus: number;
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
  totalScore: number;
  topTierCount?: number;
  rank: number;
}

export interface RoomState {
  code: string;
  phase: MpPhase;
  role?: MpRole;
  monitorMode?: boolean;
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
