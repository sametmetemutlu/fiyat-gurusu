import type { CategoryFilter, RoundResult, SealedListing } from "@/lib/game";

export type SoloCounts = { ALL: number; CAR: number; HOUSE: number };

async function post<T>(url: string, body: unknown): Promise<T> {
  let lastError = "İstek başarısız";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) return data as T;
      lastError = data?.error || "İstek başarısız";
      if (res.status < 500 && res.status !== 429) break;
    } catch {
      lastError = "Bağlantı koptu";
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(lastError);
}

export function fetchCounts(): Promise<{ ok: true; counts: SoloCounts }> {
  return fetch("/api/solo/counts")
    .then((r) => r.json())
    .then((data) => {
      if (!data?.ok) throw new Error("Sayılar alınamadı");
      return data;
    });
}

export function dealClassic(category: CategoryFilter) {
  return post<{ ok: true; rounds: SealedListing[] }>("/api/solo/deal", { mode: "classic", category });
}

export function dealPair(category: CategoryFilter) {
  return post<{ ok: true; pair: [SealedListing, SealedListing] }>("/api/solo/deal", {
    mode: "higherlower",
    category,
  });
}

export function scoreClassic(seal: string, guess: number | null, timeLeft: number, timedOut: boolean) {
  return post<{ ok: true; answerPrice: number; result: RoundResult }>("/api/solo/score", {
    kind: "classic",
    seal,
    guess,
    timeLeft,
    timedOut,
  });
}

export function scoreHigherLower(
  seals: [string, string],
  pick: 0 | 1 | null,
  timeLeft: number,
  timedOut: boolean
) {
  return post<{
    ok: true;
    prices: [number, number];
    higherSide: 0 | 1;
    correct: boolean;
    points: number;
    speedBonus: number;
    timedOut: boolean;
  }>("/api/solo/score", { kind: "higherlower", seals, pick, timeLeft, timedOut });
}
