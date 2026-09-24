import fs from "fs";
import path from "path";
import {
  CLASSIC_ROUND_SECONDS,
  HL_CORRECT_POINTS,
  HIGHER_LOWER_ROUND_SECONDS,
  type CategoryFilter,
  type Listing,
  type RoundResult,
  type SealedListing,
  evaluate,
  isPlayable,
  matchesFilter,
  pickComparisonPair,
  shuffle,
  speedBonus,
  timeoutResult,
} from "@/lib/game";
import { openListingId, sealListingId } from "@/lib/roundSeal";

let listingsCache: Listing[] | null = null;
let byIdCache: Map<string, Listing> | null = null;

function loadListings(): Listing[] {
  if (typeof window !== "undefined") throw new Error("Fiyat kataloğu yalnızca sunucuda");
  if (listingsCache) return listingsCache;
  const file = path.join(process.cwd(), "src/data/listings.json");
  listingsCache = JSON.parse(fs.readFileSync(file, "utf8")) as Listing[];
  return listingsCache;
}

function byId(): Map<string, Listing> {
  if (!byIdCache) byIdCache = new Map(loadListings().map((l) => [l.id, l]));
  return byIdCache;
}

const CLASSIC_DEAL = 10;

function toPublic(l: Listing): SealedListing {
  return {
    id: l.id,
    category: l.category,
    listingDate: l.listingDate,
    attributes: l.attributes,
    photos: l.photos,
    seal: sealListingId(l.id),
  };
}

function clampTime(value: unknown, total: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(total, Math.floor(n)));
}

export function playableCounts() {
  let all = 0;
  let car = 0;
  let house = 0;
  for (const l of loadListings()) {
    if (!isPlayable(l)) continue;
    all += 1;
    if (l.category === "CAR") car += 1;
    else house += 1;
  }
  return { ALL: all, CAR: car, HOUSE: house };
}

export function dealClassic(category: CategoryFilter): SealedListing[] {
  const pool = shuffle(loadListings().filter((l) => matchesFilter(l, category) && isPlayable(l)));
  return pool.slice(0, Math.min(CLASSIC_DEAL, pool.length)).map(toPublic);
}

export function dealPair(category: CategoryFilter): [SealedListing, SealedListing] | null {
  const picked = pickComparisonPair(loadListings(), category);
  if (!picked) return null;
  return [toPublic(picked.pair[0]), toPublic(picked.pair[1])];
}

export function scoreClassic(
  seal: string,
  guess: unknown,
  timeLeft: unknown,
  timedOut: boolean
): { answerPrice: number; result: RoundResult } | { error: string } | null {
  const listing = listingFromSeal(seal);
  if (!listing) return null;
  if (timedOut) return { answerPrice: listing.realPrice, result: timeoutResult() };
  const n = Number(guess);
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000_000_000) return { error: "Geçersiz tahmin" };
  const left = clampTime(timeLeft, CLASSIC_ROUND_SECONDS);
  return { answerPrice: listing.realPrice, result: evaluate(n, listing.realPrice, left, CLASSIC_ROUND_SECONDS) };
}

export function scorePair(
  seals: unknown,
  pick: unknown,
  timeLeft: unknown,
  timedOut: boolean
):
  | {
      prices: [number, number];
      higherSide: 0 | 1;
      correct: boolean;
      points: number;
      speedBonus: number;
      timedOut: boolean;
    }
  | { error: string }
  | null {
  if (!Array.isArray(seals) || seals.length !== 2) return null;
  const left = listingFromSeal(seals[0]);
  const right = listingFromSeal(seals[1]);
  if (!left || !right || left.id === right.id) return null;
  const higherSide: 0 | 1 = left.realPrice >= right.realPrice ? 0 : 1;
  const prices: [number, number] = [left.realPrice, right.realPrice];
  if (timedOut || pick == null) {
    return { prices, higherSide, correct: false, points: 0, speedBonus: 0, timedOut: true };
  }
  if (pick !== 0 && pick !== 1) return { error: "Geçersiz seçim" };
  const correct = pick === higherSide;
  const bonus = correct
    ? speedBonus(HL_CORRECT_POINTS, clampTime(timeLeft, HIGHER_LOWER_ROUND_SECONDS), HIGHER_LOWER_ROUND_SECONDS)
    : 0;
  return {
    prices,
    higherSide,
    correct,
    points: correct ? HL_CORRECT_POINTS + bonus : 0,
    speedBonus: bonus,
    timedOut: false,
  };
}

function listingFromSeal(seal: unknown): Listing | null {
  if (typeof seal !== "string") return null;
  const id = openListingId(seal);
  if (!id) return null;
  return byId().get(id) ?? null;
}
