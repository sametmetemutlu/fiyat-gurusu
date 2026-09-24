"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PhotoGallery from "./PhotoGallery";
import RoundTimer from "./RoundTimer";
import { useRoundTimer } from "@/hooks/useRoundTimer";
import {
  CATEGORY_LABELS,
  CLASSIC_ROUND_SECONDS,
  CategoryFilter,
  chipsFor,
  formatTRY,
  midOf,
  RoundResult,
  SealedListing,
  sliderRange,
} from "@/lib/game";
import { dealClassic, fetchCounts, scoreClassic, type SoloCounts } from "@/lib/soloClient";
import PricePad from "./PricePad";
import ClassicStage from "./ClassicStage";

type Screen = "menu" | "playing" | "result";

const ROUNDS = 10;

export default function Game({ onExit }: { onExit?: () => void }) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [queue, setQueue] = useState<SealedListing[]>([]);
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [answerPrice, setAnswerPrice] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [best, setBest] = useState(0);
  const [counts, setCounts] = useState<SoloCounts | null>(null);
  const [starting, setStarting] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const timeLeftRef = useRef(CLASSIC_ROUND_SECONDS);
  const lockedRef = useRef(false);

  useEffect(() => {
    const b = Number(localStorage.getItem("fg_best") || 0);
    setBest(b);
    fetchCounts()
      .then((d) => setCounts(d.counts))
      .catch(() => {});
  }, []);

  const current = queue[round];

  const start = async (f: CategoryFilter) => {
    if (starting) return;
    setStarting(true);
    setScoreError("");
    try {
      const data = await dealClassic(f);
      const q = data.rounds.slice(0, ROUNDS);
      setQueue(q);
      setRound(0);
      setTotalScore(0);
      setResult(null);
      setAnswerPrice(null);
      lockedRef.current = false;
      if (q.length) {
        setGuess(midOf(q[0]));
        setScreen("playing");
      }
    } catch {
      setScoreError("İlanlar yüklenemedi");
    } finally {
      setStarting(false);
    }
  };

  const submit = useCallback(async (fromTimeout = false) => {
    if (!current || screen !== "playing" || lockedRef.current) return;
    lockedRef.current = true;
    setScoreError("");
    try {
      const data = await scoreClassic(
        current.seal,
        fromTimeout ? null : guess,
        timeLeftRef.current,
        fromTimeout
      );
      setAnswerPrice(data.answerPrice);
      setResult(data.result);
      if (!fromTimeout) setTotalScore((s) => s + data.result.score);
      setScreen("result");
    } catch {
      lockedRef.current = false;
      setScoreError("Puan hesaplanamadı, tekrar dene");
    }
  }, [current, guess, screen]);

  const timer = useRoundTimer(
    CLASSIC_ROUND_SECONDS,
    screen === "playing",
    `${round}-${current?.id ?? ""}`,
    () => submit(true)
  );
  timeLeftRef.current = timer.remaining;

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
    setAnswerPrice(null);
    lockedRef.current = false;
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
            var — yakın tahmin puan getirir, erken cevap hız puanı ekler.
          </p>
        </div>

        <div className="w-full fg-card p-5 space-y-4">
          <p className="text-sm text-muted">Kategori seç ve başla</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["ALL", "🎲 Hepsi"],
              ["CAR", "🚗 Araba"],
              ["HOUSE", "🏠 Ev"],
            ] as [CategoryFilter, string][]).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => start(f)}
                  disabled={starting}
                  className="rounded-2xl bg-black/[0.03] border border-black/10 hover:bg-brand/10 hover:border-brand/40 text-foreground font-semibold py-4 px-2 transition active:scale-95 disabled:opacity-50"
                >
                  <div className="text-base">{label}</div>
                  <div className="text-[11px] text-muted font-normal">
                    {counts ? `${counts[f]} ilan` : "…"}
                  </div>
                </button>
              ))}
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
        {scoreError && <p className="text-sm font-semibold text-red-600">{scoreError}</p>}
      </div>
    );
  }

  if (!current) return null;

  const chips = chipsFor(current);
  const { min, max } = sliderRange(current);

  // ---------- HEADER ----------
  const header = (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-black/[0.05] text-foreground font-medium">
          Tur {round + 1}/{queue.length}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-brand/15 text-brand font-medium">
          {CATEGORY_LABELS[current.category]}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-display font-extrabold text-gold">{totalScore} puan</span>
      </div>
    </div>
  );

  // ---------- RESULT ----------
  if (screen === "result" && result && answerPrice != null) {
    const over = !result.timedOut && guess > answerPrice;
    const under = !result.timedOut && guess < answerPrice;
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        {header}
        <div className="fg-card p-6 text-center space-y-5 animate-slideup">
          <div className="text-lg font-semibold text-brand">{result.tierLabel}</div>

          <div className="space-y-1">
            <div className="text-sm text-muted">Gerçek fiyat</div>
            <div className="font-display text-4xl font-extrabold text-gold animate-countup">
              {formatTRY(answerPrice)}
            </div>
            <div className="text-sm text-muted">
              {result.timedOut ? (
                "Süre doldu, bu turdan puan yok"
              ) : (
                <>
                  Senin tahminin:{" "}
                  <span className={over ? "text-orange-600" : under ? "text-sky-600" : "text-brand"}>
                    {formatTRY(guess)} {over ? "(yüksek)" : under ? "(düşük)" : ""}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-6 flex-wrap">
            <div>
              <div className="font-display text-2xl font-extrabold text-foreground">+{result.basePoints}</div>
              <div className="text-xs text-muted">tahmin</div>
            </div>
            {result.speedBonus > 0 && (
              <div>
                <div className="font-display text-2xl font-extrabold text-sky-600">+{result.speedBonus}</div>
                <div className="text-xs text-muted">hız</div>
              </div>
            )}
            <div>
              <div className="font-display text-2xl font-extrabold text-brand">+{result.score}</div>
              <div className="text-xs text-muted">toplam</div>
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
    <ClassicStage
      header={header}
      timer={
        <RoundTimer
          remaining={timer.remaining}
          progress={timer.progress}
          urgent={timer.urgent}
          total={CLASSIC_ROUND_SECONDS}
        />
      }
      photo={
        <PhotoGallery photos={current.photos} alt={CATEGORY_LABELS[current.category]} resetKey={current.id} />
      }
      chips={chips.map((c, i) => (
        <span key={i} className="fg-pill">
          <span>{c.icon}</span>
          {c.label}
        </span>
      ))}
      controls={
        <div className="space-y-3">
          <PricePad min={min} max={max} value={guess} onChange={setGuess} resetKey={current.id} />
          <button
            onClick={() => submit(false)}
            disabled={guess <= 0}
            className="fg-btn fg-btn-primary w-full disabled:opacity-40"
          >
            Tahmin Et
          </button>
          {scoreError && <p className="text-sm font-semibold text-red-600 text-center">{scoreError}</p>}
        </div>
      }
    />
  );
}
