const fs = require("fs");
const path = require("path");

const CLASSIC_ROUND_SECONDS = 40;
const HIGHER_LOWER_ROUND_SECONDS = 15;
const REVEAL_SECONDS = 5;
const DEFAULT_ROUNDS = 10;
const MAX_PLAYERS = 10;
const CLASSIC_MP_LISTING_OPTIONS = [5, 10, 15, 20];
const HL_MP_ROUND_OPTIONS = [5, 10, 15, 20];
const HL_CORRECT_POINTS = 100;
const SPEED_BONUS_MAX = 10;

const SCORE_TIERS = [
  { code: "S", label: "Efsane 🎯", maxDeviation: 1, points: 100 },
  { code: "A", label: "Tam isabet 🔥", maxDeviation: 3, points: 90 },
  { code: "B", label: "Çok yakın 👍", maxDeviation: 7, points: 75 },
  { code: "C", label: "İyi ✓", maxDeviation: 12, points: 60 },
  { code: "D", label: "Orta", maxDeviation: 20, points: 45 },
  { code: "E", label: "Uzak", maxDeviation: 35, points: 25 },
  { code: "F", label: "Çok uzak", maxDeviation: 55, points: 10 },
];
const MISS_TIER = { code: "—", label: "Iska ❌", maxDeviation: Infinity, points: 0 };

let listingsCache = null;

function loadListings() {
  if (listingsCache) return listingsCache;
  const candidates = [
    path.join(__dirname, "../src/data/listings.json"),
    path.join(process.cwd(), "src/data/listings.json"),
  ];
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) throw new Error("listings.json bulunamadı");
  listingsCache = JSON.parse(fs.readFileSync(file, "utf8"));
  return listingsCache;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function matchesFilter(l, filter) {
  if (filter === "ALL") return true;
  if (filter === "CAR") return l.category === "CAR";
  return l.category === "HOUSE_SALE" || l.category === "HOUSE_RENT";
}

function deviationPct(guess, real) {
  if (real <= 0) return 100;
  return (Math.abs(guess - real) / real) * 100;
}

function tierForDeviation(dev) {
  return SCORE_TIERS.find((t) => dev <= t.maxDeviation) ?? MISS_TIER;
}

function speedBonus(basePoints, timeLeft, totalSeconds) {
  if (basePoints <= 0 || timeLeft <= 0 || totalSeconds <= 0) return 0;
  const ratio = Math.min(1, timeLeft / totalSeconds);
  return Math.max(1, Math.round(SPEED_BONUS_MAX * ratio));
}

function classicRoundPoints(guess, real, timeLeft, totalSeconds) {
  if (guess === undefined || guess === null) {
    return { points: 0, basePoints: 0, speedBonus: 0, tier: MISS_TIER, deviation: 100 };
  }
  const deviation = deviationPct(guess, real);
  const tier = tierForDeviation(deviation);
  const bonus = speedBonus(tier.points, timeLeft, totalSeconds);
  return { points: tier.points + bonus, basePoints: tier.points, speedBonus: bonus, tier, deviation };
}

function isValidRoundCount(mode, n) {
  const opts = mode === "classic" ? CLASSIC_MP_LISTING_OPTIONS : HL_MP_ROUND_OPTIONS;
  return opts.includes(n);
}

function sanitizeListing(l) {
  return {
    id: l.id,
    category: l.category,
    listingDate: l.listingDate ?? null,
    attributes: l.attributes,
    photos: Array.isArray(l.photos) ? l.photos : [],
  };
}

// src/lib/game.ts PRICE_BOUNDS ile aynı tut.
const PRICE_BOUNDS = {
  CAR: { min: 50_000, max: 80_000_000, step: 1_000 },
  HOUSE_RENT: { min: 5_000, max: 750_000, step: 500 },
  HOUSE_SALE: { min: 300_000, max: 300_000_000, step: 1_000 },
};

function isPlayable(l) {
  if (!l.realPrice || !l.photos?.length) return false;
  const b = PRICE_BOUNDS[l.category];
  return !!b && l.realPrice >= b.min && l.realPrice <= b.max;
}

function sliderRange(l) {
  return PRICE_BOUNDS[l.category] || PRICE_BOUNDS.HOUSE_SALE;
}

function midOf(l) {
  const { min, max } = sliderRange(l);
  const mid = Math.exp((Math.log(min) + Math.log(max)) / 2);
  return Math.round(mid / 1000) * 1000;
}

function priceChallengeOk(a, b) {
  const hi = Math.max(a.realPrice, b.realPrice);
  const lo = Math.min(a.realPrice, b.realPrice);
  if (lo <= 0) return false;
  const r = hi / lo;
  return r >= 1.05 && r <= 1.15;
}

function pickComparisonPair(all, filter) {
  const pool = all.filter((l) => matchesFilter(l, filter) && isPlayable(l));
  if (pool.length < 2) return null;
  const order = shuffle(pool);

  const ret = (a, b) => (Math.random() < 0.5 ? [a, b] : [b, a]);

  for (const a of order) {
    const sameType = pool.filter(
      (b) => b.id !== a.id && b.category === a.category && b.realPrice !== a.realPrice
    );
    if (!sameType.length) continue;
    const cands = sameType.filter((b) => priceChallengeOk(a, b));
    if (cands.length) return ret(a, cands[Math.floor(Math.random() * cands.length)]);
  }

  return null;
}

function pickClassicRounds(filter, count) {
  const pool = shuffle(loadListings().filter((l) => matchesFilter(l, filter) && isPlayable(l)));
  return pool.slice(0, Math.min(count, pool.length));
}

function pickHLRounds(filter, count) {
  const rounds = [];
  const all = loadListings();
  for (let i = 0; i < count; i++) {
    const pair = pickComparisonPair(all, filter);
    if (!pair) break;
    rounds.push(pair);
  }
  return rounds;
}

function generateCode(existing) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!existing.has(code)) return code;
  }
  throw new Error("Oda kodu üretilemedi");
}

module.exports = {
  CLASSIC_ROUND_SECONDS,
  HIGHER_LOWER_ROUND_SECONDS,
  REVEAL_SECONDS,
  DEFAULT_ROUNDS,
  MAX_PLAYERS,
  CLASSIC_MP_LISTING_OPTIONS,
  HL_MP_ROUND_OPTIONS,
  HL_CORRECT_POINTS,
  loadListings,
  sanitizeListing,
  sliderRange,
  midOf,
  deviationPct,
  classicRoundPoints,
  speedBonus,
  isValidRoundCount,
  pickClassicRounds,
  pickHLRounds,
  generateCode,
};
