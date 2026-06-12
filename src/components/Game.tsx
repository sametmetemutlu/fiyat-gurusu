"use client";

import { useCallback, useEffect, useState } from "react";
import rawListings from "@/data/listings.json";
import PhotoGallery from "./PhotoGallery";
import RoundTimer from "./RoundTimer";
import { useRoundTimer } from "@/hooks/useRoundTimer";
import {
  CATEGORY_LABELS,
  CLASSIC_ROUND_SECONDS,
  CategoryFilter,
  chipsFor,
  Listing,
  evaluate,
  formatTRY,
  matchesFilter,
  midOf,
  RoundResult,
  shuffle,
  sliderRange,
  streakMultiplier,
} from "@/lib/game";

const listings = rawListings as Listing[];

type Screen = "menu" | "playing" | "result";

const ROUNDS = 10;

export default function Game({ onExit }: { onExit?: () => void }) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [filter, setFilter] = useState<CategoryFilter>("ALL");
  const [queue, setQueue] = useState<Listing[]>([]);
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const b = Number(localStorage.getItem("fg_best") || 0);
    setBest(b);
  }, []);

  const current = queue[round];

  const start = (f: CategoryFilter) => {
    const pool = shuffle(listings.filter((l) => matchesFilter(l, f)));
    const q = pool.slice(0, Math.min(ROUNDS, pool.length));
    setFilter(f);
    setQueue(q);
    setRound(0);
    setTotalScore(0);
    setStreak(0);
    setResult(null);
    if (q.length) {
      setGuess(midOf(q[0]));
      setScreen("playing");
    }
  };

  const submit = useCallback(() => {
    if (!current || screen !== "playing") return;
    const r = evaluate(guess, current.realPrice);
    const mult = streakMultiplier(streak);
    const gained = Math.round(r.score * (r.score >= 50 ? mult : 1));
    setResult({ ...r, score: gained });
    setTotalScore((s) => s + gained);
    setStreak((s) => (r.score >= 50 ? s + 1 : 0));
    setScreen("result");
  }, [current, guess, screen, streak]);

  const timer = useRoundTimer(
    CLASSIC_ROUND_SECONDS,
    screen === "playing",
    `${round}-${current?.id ?? ""}`,
    submit
  );

  const next = () => {
    const n = round + 1;
    if (n >= queue.length) {
      const finalScore = totalScore;
      if (finalScore > best) {
        setBest(finalScore);
        localStorage.setItem("fg_best", String(finalScore));
      }
      setScreen("menu");
      return;
    }
    setRound(n);
    setGuess(midOf(queue[n]));
    setResult(null);
    setScreen("playing");
  };

  const isLast = round + 1 >= queue.length;

  // ---------- MENU ----------
  if (screen === "menu") {
    return (
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col items-center text-center gap-8">
        {onExit && (
          <button
            onClick={onExit}
            className="self-start text-sm font-semibold text-muted hover:text-foreground"
          >
            ‹ Mod seçimi
          </button>
        )}
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">🎯 Klasik Mod</h2>
          <p className="text-muted">
            İlanın fiyatını tahmin et. Her tur için <b className="text-foreground">{CLASSIC_ROUND_SECONDS} sn</b>{" "}
            var — ne kadar yakınsan o kadar çok puan!
          </p>
        </div>

        <div className="w-full fg-card p-5 space-y-4">
          <p className="text-sm text-muted">Kategori seç ve başla</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["ALL", "🎲 Hepsi"],
              ["CAR", "🚗 Araba"],
              ["HOUSE", "🏠 Ev"],
            ] as [CategoryFilter, string][]).map(([f, label]) => {
              const count = listings.filter((l) => matchesFilter(l, f)).length;
              return (
                <button
                  key={f}
                  onClick={() => start(f)}
                  className="rounded-2xl bg-black/[0.03] border border-black/10 hover:bg-brand/10 hover:border-brand/40 text-foreground font-semibold py-4 px-2 transition active:scale-95"
                >
                  <div className="text-base">{label}</div>
                  <div className="text-[11px] text-muted font-normal">{count} ilan</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-8 text-sm">
          <div>
            <div className="font-display text-2xl font-extrabold text-gold">{best}</div>
            <div className="text-xs text-muted">En yüksek skor</div>
          </div>
          <div>
            <div className="font-display text-2xl font-extrabold text-brand">{CLASSIC_ROUND_SECONDS}s</div>
            <div className="text-xs text-muted">Tur süresi</div>
          </div>
        </div>

        <p className="text-xs text-muted/70 max-w-xs">
          İlanlar gerçek verilerden derlenmiştir. Fiyatlar zamanla değişebilir.
        </p>
      </div>
    );
  }

  if (!current) return null;

  const chips = chipsFor(current);
  const { min, max, step } = sliderRange(current);

  // ---------- HEADER ----------
  const header = (
    <div className="flex items-center justify-between text-sm mb-4">
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-black/[0.05] text-foreground font-medium">
          Tur {round + 1}/{queue.length}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-brand/15 text-brand font-medium">
          {CATEGORY_LABELS[current.category]}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {streak > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-600 font-semibold">
            🔥 {streak} seri
          </span>
        )}
        <span className="font-display font-extrabold text-gold">{totalScore} puan</span>
      </div>
    </div>
  );

  // ---------- RESULT ----------
  if (screen === "result" && result) {
    const over = guess > current.realPrice;
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        {header}
        <div className="fg-card p-6 text-center space-y-5 animate-slideup">
          <div className="text-lg text-foreground/90">{result.verdict}</div>

          <div className="space-y-1">
            <div className="text-sm text-muted">Gerçek fiyat</div>
            <div className="font-display text-4xl font-extrabold text-gold animate-countup">
              {formatTRY(current.realPrice)}
            </div>
            <div className="text-sm text-muted">
              Senin tahminin:{" "}
              <span className={over ? "text-orange-600" : "text-sky-600"}>
                {formatTRY(guess)} {over ? "(yüksek)" : "(düşük)"}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-8">
            <div>
              <div className="font-display text-2xl font-extrabold text-foreground">
                %{result.deviation.toFixed(1)}
              </div>
              <div className="text-xs text-muted">sapma</div>
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold text-brand">+{result.score}</div>
              <div className="text-xs text-muted">puan</div>
            </div>
          </div>

          <button onClick={next} className="fg-btn fg-btn-primary w-full">
            {isLast ? "Oyunu Bitir →" : "Sıradaki İlan →"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- PLAYING ----------
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {header}
      <RoundTimer
        remaining={timer.remaining}
        progress={timer.progress}
        urgent={timer.urgent}
        total={CLASSIC_ROUND_SECONDS}
      />
      <PhotoGallery photos={current.photos} alt={CATEGORY_LABELS[current.category]} resetKey={current.id} />

      <div className="flex flex-wrap gap-2 mt-4">
        {chips.map((c, i) => (
          <span key={i} className="fg-pill">
            <span>{c.icon}</span>
            {c.label}
          </span>
        ))}
      </div>

      <div className="mt-6 fg-card p-5 space-y-4">
        <div className="text-center">
          <div className="text-sm text-muted">Tahminin</div>
          <div className="font-display text-3xl font-extrabold text-brand">{formatTRY(guess)}</div>
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, guess))}
          onChange={(e) => setGuess(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>{formatTRY(min)}</span>
          <span>{formatTRY(max)}</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={guess}
            onChange={(e) => setGuess(Number(e.target.value) || 0)}
            className="flex-1 bg-black/[0.03] border border-black/10 rounded-xl px-3 py-2.5 text-foreground text-right font-semibold outline-none focus:border-brand focus:bg-white"
          />
          <span className="text-muted font-semibold">TL</span>
        </div>

        <button onClick={submit} className="fg-btn fg-btn-primary w-full">
          Tahmin Et
        </button>
      </div>
    </div>
  );
}
