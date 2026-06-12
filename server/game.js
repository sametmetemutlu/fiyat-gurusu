const fs = require("fs");
const path = require("path");

const CLASSIC_ROUND_SECONDS = 40;
const HIGHER_LOWER_ROUND_SECONDS = 15;
const REVEAL_SECONDS = 5;
const DEFAULT_ROUNDS = 5;
const MAX_PLAYERS = 10;

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

function sanitizeListing(l) {
  const { realPrice, ...rest } = l;
  return rest;
}

function sliderRange(l) {
  if (l.category === "CAR") return { min: 50_000, max: 5_000_000, step: 5_000 };
  if (l.category === "HOUSE_RENT") return { min: 5_000, max: 200_000, step: 1_000 };
  return { min: 300_000, max: 40_000_000, step: 50_000 };
}

function midOf(l) {
  const { min, max } = sliderRange(l);
  return Math.round((min + max) / 2 / 1000) * 1000;
}

function priceChallengeOk(a, b) {
  const hi = Math.max(a.realPrice, b.realPrice);
  const lo = Math.min(a.realPrice, b.realPrice);
  if (lo <= 0) return false;
  const r = hi / lo;
  return r >= 1.15 && r <= 3;
}

function pickComparisonPair(all, filter) {
  const pool = all.filter((l) => matchesFilter(l, filter));
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
    if (sameType.length) return ret(a, sameType[Math.floor(Math.random() * sameType.length)]);
  }

  const a = order[0];
  const b = order.find((l) => l.id !== a.id && l.realPrice !== a.realPrice);
  return b ? ret(a, b) : null;
}

function pickClassicRounds(filter, count) {
  const pool = shuffle(loadListings().filter((l) => matchesFilter(l, filter)));
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
  loadListings,
  sanitizeListing,
  sliderRange,
  midOf,
  deviationPct,
  pickClassicRounds,
  pickHLRounds,
  generateCode,
};
