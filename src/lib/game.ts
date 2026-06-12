export type Category = "CAR" | "HOUSE_SALE" | "HOUSE_RENT";

export interface CarAttributes {
  marka: string | null;
  model: string | null;
  yil: number | null;
  renk: string | null;
  km: number | null;
  vites: string | null;
  yakitTipi: string | null;
  hasarDurumu: string | null;
}

export interface HouseAttributes {
  m2: number | null;
  odaSayisi: string | null;
  binaKatSayisi: number | null;
  bulunduguKat: string | null;
  il: string | null;
  ilce: string | null;
}

export interface Listing {
  id: string;
  category: Category;
  realPrice: number;
  listingDate: string | null;
  attributes: CarAttributes | HouseAttributes;
  photos: string[];
}

export type CategoryFilter = "ALL" | "CAR" | "HOUSE";

/** Tur başına süre (saniye) */
export const CLASSIC_ROUND_SECONDS = 40;
export const HIGHER_LOWER_ROUND_SECONDS = 15;

export const CATEGORY_LABELS: Record<Category, string> = {
  CAR: "Araba",
  HOUSE_SALE: "Satılık Ev",
  HOUSE_RENT: "Kiralık Ev",
};

export function isCar(l: Listing): l is Listing & { attributes: CarAttributes } {
  return l.category === "CAR";
}

/** Tahmin sapması (%) */
export function deviationPct(guess: number, real: number): number {
  if (real <= 0) return 100;
  return (Math.abs(guess - real) / real) * 100;
}

export interface ScoreTier {
  code: string;
  label: string;
  maxDeviation: number;
  points: number;
}

/** Klasik mod kademe tablosu */
export const SCORE_TIERS: ScoreTier[] = [
  { code: "S", label: "Efsane 🎯", maxDeviation: 1, points: 100 },
  { code: "A", label: "Tam isabet 🔥", maxDeviation: 3, points: 90 },
  { code: "B", label: "Çok yakın 👍", maxDeviation: 7, points: 75 },
  { code: "C", label: "İyi ✓", maxDeviation: 12, points: 60 },
  { code: "D", label: "Orta", maxDeviation: 20, points: 45 },
  { code: "E", label: "Uzak", maxDeviation: 35, points: 25 },
  { code: "F", label: "Çok uzak", maxDeviation: 55, points: 10 },
];

export const MISS_TIER: ScoreTier = { code: "—", label: "Iska ❌", maxDeviation: Infinity, points: 0 };

export const STREAK_MIN_POINTS = 60;
export const STREAK_BONUS_PER = 5;
export const STREAK_BONUS_MAX = 20;
export const HL_CORRECT_POINTS = 100;

/** Çok oyunculu klasik mod ilan sayısı seçenekleri */
export const CLASSIC_MP_LISTING_OPTIONS = [5, 10, 15, 20] as const;
/** Çok oyunculu Hangisi Pahalı tur seçenekleri */
export const HL_MP_ROUND_OPTIONS = [5, 10, 15, 20] as const;

export function tierForDeviation(dev: number): ScoreTier {
  return SCORE_TIERS.find((t) => dev <= t.maxDeviation) ?? MISS_TIER;
}

export function scoreFor(guess: number, real: number): number {
  return tierForDeviation(deviationPct(guess, real)).points;
}

export function streakBonus(streak: number): number {
  return Math.min(STREAK_BONUS_MAX, streak * STREAK_BONUS_PER);
}

export interface RoundResult {
  deviation: number;
  score: number;
  basePoints: number;
  streakBonus: number;
  tierCode: string;
  tierLabel: string;
  exact: boolean;
  verdict: string;
}

export function evaluate(guess: number, real: number, streak = 0): RoundResult {
  const deviation = deviationPct(guess, real);
  const tier = tierForDeviation(deviation);
  const basePoints = tier.points;
  const qualifies = basePoints >= STREAK_MIN_POINTS;
  const bonus = qualifies ? streakBonus(streak) : 0;
  const score = basePoints + bonus;
  const exact = deviation <= 1;
  return {
    deviation,
    score,
    basePoints,
    streakBonus: bonus,
    tierCode: tier.code,
    tierLabel: tier.label,
    exact,
    verdict: tier.label,
  };
}

/** Seri güncelleme: ≥60 puan alındıysa +1, değilse sıfırla */
export function nextStreak(streak: number, basePoints: number): number {
  return basePoints >= STREAK_MIN_POINTS ? streak + 1 : 0;
}

export function formatTRY(n: number): string {
  return n.toLocaleString("tr-TR") + " TL";
}

export function formatKm(n: number | null): string {
  return n == null ? "?" : n.toLocaleString("tr-TR") + " km";
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function matchesFilter(l: Listing, filter: CategoryFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "CAR") return l.category === "CAR";
  return l.category === "HOUSE_SALE" || l.category === "HOUSE_RENT";
}

export interface Chip {
  icon: string;
  label: string;
}

export function chipsFor(l: Listing): Chip[] {
  if (isCar(l)) {
    const a = l.attributes as CarAttributes;
    return [
      { icon: "🚗", label: [a.marka, a.model].filter(Boolean).join(" ") },
      { icon: "📅", label: a.yil ? `${a.yil}` : "?" },
      { icon: "⚙️", label: a.vites ?? "?" },
      { icon: "⛽", label: a.yakitTipi ?? "?" },
      { icon: "🛣️", label: formatKm(a.km) },
      { icon: "🎨", label: a.renk ?? "?" },
      { icon: "🔧", label: a.hasarDurumu ?? "?" },
    ].filter((c) => c.label && c.label !== "?");
  }
  const a = l.attributes as HouseAttributes;
  // "5 katlı / 3.kat" gibi birleşik kat bilgisi
  const floorParts: string[] = [];
  if (a.binaKatSayisi) floorParts.push(`${a.binaKatSayisi} katlı`);
  if (a.bulunduguKat) floorParts.push(a.bulunduguKat.replace(/\s*Kat/i, ".kat").replace(/\.+/g, "."));
  const floorLabel = floorParts.join(" / ");
  return [
    { icon: "📐", label: a.m2 ? `${a.m2} m²` : "?" },
    { icon: "🚪", label: a.odaSayisi ?? "?" },
    { icon: "🏢", label: floorLabel },
    { icon: "📍", label: [a.il, a.ilce].filter(Boolean).join(" / ") },
  ].filter((c) => c.label && c.label !== "?");
}

// ---------- "Hangisi Pahalı?" akıllı eşleştirme ----------
// Karşılaştırılan iki ilan ortak özellik taşısın + fiyatları yakın olsun ki zorlayıcı olsun.
const MIN_PRICE_RATIO = 1.15; // pahalı olan en az %15 daha pahalı (yazı-tura olmasın)
const MAX_PRICE_RATIO = 3; // ama 3x'ten fazla fark olmasın (çok kolay olmasın)

function approx(x: number | null, y: number | null, pct: number): boolean {
  if (x == null || y == null || x <= 0 || y <= 0) return false;
  return Math.abs(x - y) / Math.max(x, y) <= pct;
}

function priceChallengeOk(a: Listing, b: Listing): boolean {
  const hi = Math.max(a.realPrice, b.realPrice);
  const lo = Math.min(a.realPrice, b.realPrice);
  if (lo <= 0) return false;
  const r = hi / lo;
  return r >= MIN_PRICE_RATIO && r <= MAX_PRICE_RATIO;
}

interface SimRule {
  reason: string;
  weight?: number; // eşleşme olasılığı ağırlığı (varsayılan 1)
  match: (b: Listing) => boolean;
}

// Mutlak fiyat bantları (TL) — "ikisi de aynı bantta" eşleşmesi için.
// Ortak başka özellik olmadan sadece fiyatları yakın → kullanıcının kafasını karıştırır.
const CAR_PRICE_BANDS: [number, number][] = [
  [0, 200_000], [200_000, 400_000], [400_000, 600_000], [600_000, 900_000],
  [900_000, 1_300_000], [1_300_000, 2_000_000], [2_000_000, 3_500_000], [3_500_000, Infinity],
];
const HOUSE_SALE_BANDS: [number, number][] = [
  [0, 1_500_000], [1_500_000, 3_000_000], [3_000_000, 5_000_000],
  [5_000_000, 8_000_000], [8_000_000, 15_000_000], [15_000_000, Infinity],
];
const HOUSE_RENT_BANDS: [number, number][] = [
  [0, 15_000], [15_000, 25_000], [25_000, 40_000], [40_000, 70_000], [70_000, Infinity],
];

function bandFor(l: Listing): [number, number] | null {
  const bands = l.category === "CAR" ? CAR_PRICE_BANDS : l.category === "HOUSE_RENT" ? HOUSE_RENT_BANDS : HOUSE_SALE_BANDS;
  return bands.find(([lo, hi]) => l.realPrice >= lo && l.realPrice < hi) ?? null;
}

/** A ilanına göre, benzerlik kuralları (sıkıdan gevşeğe) */
function rulesFor(a: Listing): SimRule[] {
  const rules: SimRule[] = [];
  if (isCar(a)) {
    const ca = a.attributes as CarAttributes;
    const car = (b: Listing) => b.attributes as CarAttributes;
    if (ca.marka && ca.yil != null)
      rules.push({ reason: `İkisi de ${ca.marka} • ${ca.yil} model`, match: (b) => car(b).marka === ca.marka && car(b).yil === ca.yil });
    if (ca.marka)
      rules.push({ reason: `İkisi de ${ca.marka}, yakın model yılı`, match: (b) => car(b).marka === ca.marka && ca.yil != null && car(b).yil != null && Math.abs((car(b).yil as number) - (ca.yil as number)) <= 1 });
    if (ca.yil != null)
      rules.push({ reason: `İkisi de ${ca.yil} model`, match: (b) => car(b).yil === ca.yil });
    if (ca.marka)
      rules.push({ reason: `İkisi de ${ca.marka}`, match: (b) => car(b).marka === ca.marka });
    rules.push({ reason: `Benzer yıl ve kilometre`, match: (b) => approx(ca.km, car(b).km, 0.25) && approx(ca.yil, car(b).yil, 0.08) });
  } else {
    const ha = a.attributes as HouseAttributes;
    const house = (b: Listing) => b.attributes as HouseAttributes;
    if (ha.il && ha.odaSayisi)
      rules.push({ reason: `İkisi de ${ha.il} • ${ha.odaSayisi}`, match: (b) => house(b).il === ha.il && house(b).odaSayisi === ha.odaSayisi });
    if (ha.il)
      rules.push({ reason: `İkisi de ${ha.il}, benzer büyüklük`, match: (b) => house(b).il === ha.il && approx(ha.m2, house(b).m2, 0.25) });
    if (ha.il)
      rules.push({ reason: `İkisi de ${ha.il}`, match: (b) => house(b).il === ha.il });
    if (ha.odaSayisi)
      rules.push({ reason: `İkisi de ${ha.odaSayisi}`, match: (b) => house(b).odaSayisi === ha.odaSayisi });
    if (ha.m2)
      rules.push({ reason: `Benzer büyüklük (~${ha.m2} m²)`, match: (b) => approx(ha.m2, house(b).m2, 0.2) });
  }
  // Mutlak fiyat bandı eşleşmesi — ortak başka özellik olmasa da fiyatları yakın (kafa karıştırıcı, ağırlıklı)
  const band = bandFor(a);
  if (band)
    rules.push({
      reason: `Benzer fiyat aralığı`,
      weight: 3,
      match: (b) => {
        const bb = bandFor(b);
        return !!bb && bb[0] === band[0];
      },
    });
  return rules;
}

export interface PairResult {
  pair: [Listing, Listing];
  reason: string;
}

/** İki ilanı ortak özellik + fiyat yakınlığına göre eşleştirir. */
export function pickComparisonPair(all: Listing[], filter: CategoryFilter): PairResult | null {
  const pool = all.filter((l) => matchesFilter(l, filter));
  if (pool.length < 2) return null;
  const order = shuffle(pool);

  const ret = (a: Listing, b: Listing, reason: string): PairResult => ({
    pair: Math.random() < 0.5 ? [a, b] : [b, a],
    reason,
  });

  for (const a of order) {
    // Sadece aynı kategori (satılık-satılık, kiralık-kiralık, araba-araba) + farklı fiyat
    const sameType = pool.filter((b) => b.id !== a.id && b.category === a.category && b.realPrice !== a.realPrice);
    if (!sameType.length) continue;
    // Ağırlığa göre kuralları çoğalt, sonra karıştır (ağırlığı yüksek kural daha sık seçilir)
    const weighted: SimRule[] = [];
    for (const r of rulesFor(a)) for (let i = 0; i < (r.weight ?? 1); i++) weighted.push(r);
    const rules = shuffle(weighted);

    // 1) Benzerlik + fiyat yakınlığı (ideal: zorlayıcı)
    for (const r of rules) {
      const cands = sameType.filter((b) => r.match(b) && priceChallengeOk(a, b));
      if (cands.length) return ret(a, cands[Math.floor(Math.random() * cands.length)], r.reason);
    }
    // 2) Benzerlik var ama fiyat farkı bandın dışında (yine de ortak özellikli)
    for (const r of rules) {
      const cands = sameType.filter((b) => r.match(b));
      if (cands.length) return ret(a, cands[Math.floor(Math.random() * cands.length)], r.reason);
    }
  }

  // 3) Son çare: aynı kategoriden herhangi iki farklı fiyatlı ilan
  const a = order[0];
  const b =
    order.find((l) => l.id !== a.id && l.category === a.category && l.realPrice !== a.realPrice) ||
    order.find((l) => l.id !== a.id && l.realPrice !== a.realPrice);
  if (!b) return null;
  return ret(a, b, "");
}

// Araç ekspertiz/hasar durumu → renkli rozet bilgisi (fiyatı çok etkiler)
export type ExpertiseTone = "good" | "warn" | "danger" | "neutral";
export interface Expertise {
  icon: string;
  label: string;
  tone: ExpertiseTone;
}

export function expertiseInfo(l: Listing): Expertise | null {
  if (!isCar(l)) return null;
  const raw = (l.attributes as CarAttributes).hasarDurumu || "";
  const low = raw.toLowerCase();
  if (low.includes("ağır hasar")) return { icon: "🛑", label: "Ağır hasar kayıtlı", tone: "danger" };
  const detail = raw.replace(/^boya\s*\/\s*değişen:\s*/i, "").trim();
  const dlow = detail.toLowerCase();
  if (/belirtilmemiş/.test(dlow) || !detail) return { icon: "❔", label: "Ekspertiz belirtilmemiş", tone: "neutral" };
  if (/orjinal|orijinal/.test(dlow) && !/boya|değişen/.test(dlow))
    return { icon: "✅", label: "Tamamı orijinal", tone: "good" };
  // parça değişen varsa daha ağır bir uyarı, sadece boya ise hafif uyarı
  const tone: ExpertiseTone = /değişen/.test(dlow) ? "danger" : "warn";
  return { icon: tone === "danger" ? "🔧" : "🎨", label: detail, tone };
}

export function sliderRange(l: Listing): { min: number; max: number; step: number } {
  if (l.category === "CAR") return { min: 50_000, max: 5_000_000, step: 5_000 };
  if (l.category === "HOUSE_RENT") return { min: 5_000, max: 200_000, step: 1_000 };
  return { min: 300_000, max: 40_000_000, step: 50_000 };
}

export function midOf(l: Listing): number {
  const { min, max } = sliderRange(l);
  return Math.round((min + max) / 2 / 1000) * 1000;
}
