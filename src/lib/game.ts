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

/** Oyuncuya giden ilan. Gerçek fiyat yoktur. */
export type ListingView = Omit<Listing, "realPrice">;
/** Sunucunun mühürlediği ilan. Mühür açılmadan fiyat bilinemez. */
export type SealedListing = ListingView & { seal: string };

export type CategoryFilter = "ALL" | "CAR" | "HOUSE";

/** Tur başına süre (saniye) */
export const CLASSIC_ROUND_SECONDS = 40;
export const HIGHER_LOWER_ROUND_SECONDS = 15;

export const CATEGORY_LABELS: Record<Category, string> = {
  CAR: "Araba",
  HOUSE_SALE: "Satılık Ev",
  HOUSE_RENT: "Kiralık Ev",
};

export function isCar(l: ListingView): l is ListingView & { attributes: CarAttributes } {
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

/** Erken cevap bonusu. En küçük kademe farkı 10 olduğu için hız bir üst kademeyi geçemez. */
export const SPEED_BONUS_MAX = 10;
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

/** İskada hız puanı yok. Süre bitmeden verilen isabetli cevap en az +1 alır. */
export function speedBonus(basePoints: number, timeLeft: number, totalSeconds: number): number {
  if (basePoints <= 0 || timeLeft <= 0 || totalSeconds <= 0) return 0;
  const ratio = Math.min(1, timeLeft / totalSeconds);
  return Math.max(1, Math.round(SPEED_BONUS_MAX * ratio));
}

export interface RoundResult {
  score: number;
  basePoints: number;
  speedBonus: number;
  tierCode: string;
  tierLabel: string;
  exact: boolean;
  verdict: string;
  timedOut: boolean;
}

export function timeoutResult(): RoundResult {
  return {
    score: 0,
    basePoints: 0,
    speedBonus: 0,
    tierCode: "—",
    tierLabel: "Süre doldu ⏱",
    exact: false,
    verdict: "Süre doldu ⏱",
    timedOut: true,
  };
}

export function evaluate(guess: number, real: number, timeLeft: number, totalSeconds: number): RoundResult {
  const deviation = deviationPct(guess, real);
  const tier = tierForDeviation(deviation);
  const basePoints = tier.points;
  const bonus = speedBonus(basePoints, timeLeft, totalSeconds);
  return {
    score: basePoints + bonus,
    basePoints,
    speedBonus: bonus,
    tierCode: tier.code,
    tierLabel: tier.label,
    exact: deviation <= 1,
    verdict: tier.label,
    timedOut: false,
  };
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

export function matchesFilter(l: ListingView, filter: CategoryFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "CAR") return l.category === "CAR";
  return l.category === "HOUSE_SALE" || l.category === "HOUSE_RENT";
}

export interface Chip {
  icon: string;
  label: string;
}

export function chipsFor(l: ListingView): Chip[] {
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
const MIN_PRICE_RATIO = 1.05; // pahalı olan en az %5 daha pahalı
const MAX_PRICE_RATIO = 1.15; // iki ilan arasında en fazla %15 fark

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
  const pool = all.filter((l) => matchesFilter(l, filter) && isPlayable(l));
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

    for (const r of rules) {
      const cands = sameType.filter((b) => r.match(b) && priceChallengeOk(a, b));
      if (cands.length) return ret(a, cands[Math.floor(Math.random() * cands.length)], r.reason);
    }
    const close = sameType.filter((b) => priceChallengeOk(a, b));
    if (close.length) return ret(a, close[Math.floor(Math.random() * close.length)], "Yakın fiyat");
  }

  return null;
}

// Araç ekspertiz/hasar durumu → renkli rozet bilgisi (fiyatı çok etkiler)
export type ExpertiseTone = "good" | "warn" | "danger" | "neutral";
export interface Expertise {
  icon: string;
  label: string;
  tone: ExpertiseTone;
}

export function expertiseInfo(l: ListingView): Expertise | null {
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

/**
 * Tahmin aralığı = oynanabilir fiyat aralığı.
 * Çubuk logaritmiktir; ucuz ve pahalı ilan aynı barda seçilebilir.
 * Bu sınırların dışı (ör. 930 milyonluk Corolla) bozuk veri sayılır, oyuna girmez.
 */
export const PRICE_BOUNDS: Record<Category, { min: number; max: number; step: number }> = {
  CAR: { min: 50_000, max: 80_000_000, step: 1_000 },
  HOUSE_RENT: { min: 5_000, max: 750_000, step: 500 },
  HOUSE_SALE: { min: 300_000, max: 300_000_000, step: 1_000 },
};

/** Logaritmik çubuğun çözünürlüğü */
export const SLIDER_TICKS = 1000;

export function sliderRange(l: ListingView): { min: number; max: number; step: number } {
  return PRICE_BOUNDS[l.category];
}

export function isPlayable(l: Listing): boolean {
  if (!l.realPrice || !l.photos?.length) return false;
  const { min, max } = PRICE_BOUNDS[l.category];
  return l.realPrice >= min && l.realPrice <= max;
}

/** Çubuk adımı fiyata göre büyür; numpad ise kuruşuna kadar serbesttir. */
export function snapPrice(n: number): number {
  if (n <= 0) return 0;
  const step =
    n < 250_000 ? 1_000 : n < 2_000_000 ? 5_000 : n < 15_000_000 ? 25_000 : n < 80_000_000 ? 100_000 : 250_000;
  return Math.round(n / step) * step;
}

export function priceToTick(price: number, min: number, max: number): number {
  const p = Math.min(max, Math.max(min, price));
  const t = (Math.log(p) - Math.log(min)) / (Math.log(max) - Math.log(min));
  return Math.round(Math.min(1, Math.max(0, t)) * SLIDER_TICKS);
}

export function tickToPrice(tick: number, min: number, max: number): number {
  const t = Math.min(SLIDER_TICKS, Math.max(0, tick)) / SLIDER_TICKS;
  const raw = Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min)));
  return Math.min(max, Math.max(min, snapPrice(raw)));
}

export function suggestGuess(min: number, max: number): number {
  return tickToPrice(SLIDER_TICKS / 2, min, max);
}

export function midOf(l: ListingView): number {
  const { min, max } = sliderRange(l);
  return suggestGuess(min, max);
}
