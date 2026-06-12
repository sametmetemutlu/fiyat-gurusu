"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { usePhotoCarousel } from "@/hooks/usePhotoCarousel";
import rawListings from "@/data/listings.json";
import RoundTimer from "./RoundTimer";
import { useRoundTimer } from "@/hooks/useRoundTimer";
import {
  CATEGORY_LABELS,
  CategoryFilter,
  HIGHER_LOWER_ROUND_SECONDS,
  HL_CORRECT_POINTS,
  chipsFor,
  expertiseInfo,
  formatTRY,
  Listing,
  pickComparisonPair,
} from "@/lib/game";

const listings = rawListings as Listing[];

type Phase = "menu" | "playing" | "revealed" | "over";

export default function HigherLower({ onExit }: { onExit?: () => void }) {
  const [filter, setFilter] = useState<CategoryFilter>("ALL");
  const [phase, setPhase] = useState<Phase>("menu");
  const [pair, setPair] = useState<[Listing, Listing] | null>(null);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    setBest(Number(localStorage.getItem("fg_hl_best") || 0));
  }, []);

  const deal = (f: CategoryFilter) => {
    const res = pickComparisonPair(listings, f);
    setPair(res?.pair ?? null);
  };

  const start = (f: CategoryFilter) => {
    setFilter(f);
    setStreak(0);
    setPoints(0);
    setPicked(null);
    deal(f);
    setPhase("playing");
  };

  const pick = (i: 0 | 1) => {
    if (!pair || phase !== "playing") return;
    setPicked(i);
    const correct = pair[i].realPrice >= pair[1 - i].realPrice;
    setPhase("revealed");
    if (correct) {
      const np = points + HL_CORRECT_POINTS;
      setStreak((s) => s + 1);
      setPoints(np);
      if (np > best) {
        setBest(np);
        localStorage.setItem("fg_hl_best", String(np));
      }
    }
  };

  const handleTimeout = useCallback(() => {
    if (phase !== "playing" || !pair) return;
    setPicked(null);
    setPhase("revealed");
  }, [phase, pair]);

  const timer = useRoundTimer(
    HIGHER_LOWER_ROUND_SECONDS,
    phase === "playing",
    pair ? `${pair[0].id}-${pair[1].id}` : "",
    handleTimeout
  );

  const next = () => {
    setPicked(null);
    deal(filter);
    setPhase("playing");
  };

  const timedOut = phase === "revealed" && picked === null;
  const wasCorrect =
    pair && picked !== null && pair[picked].realPrice >= pair[1 - picked].realPrice;

  // sonuç ekranına geçiş: yanlış veya süre dolduysa over
  useEffect(() => {
    if (phase === "revealed" && pair && (timedOut || (picked !== null && !wasCorrect))) {
      const t = setTimeout(() => setPhase("over"), 1600);
      return () => clearTimeout(t);
    }
  }, [phase, pair, picked, timedOut, wasCorrect]);

  // ---------- MENU ----------
  if (phase === "menu") {
    return (
      <div className="max-w-md mx-auto px-4 py-8 flex flex-col items-center text-center gap-7 animate-slideup">
        {onExit && (
          <button onClick={onExit} className="self-start text-sm font-semibold text-muted hover:text-foreground">
            ‹ Mod seçimi
          </button>
        )}
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-extrabold">⚖️ Hangisi Pahalı?</h2>
          <p className="text-muted">
            İki ilandan <b className="text-foreground">pahalı</b> olduğunu düşündüğüne tıkla.
            Her tur <b className="text-foreground">{HIGHER_LOWER_ROUND_SECONDS} sn</b> — doğru bildikçe serin uzar,
            yanlış veya süre dolunca biter!
          </p>
        </div>
        <div className="w-full fg-card p-5 space-y-3">
          <p className="text-sm text-muted">Kategori seç</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["ALL", "🎲 Hepsi"],
              ["CAR", "🚗 Araba"],
              ["HOUSE", "🏠 Ev"],
            ] as [CategoryFilter, string][]).map(([f, label]) => (
              <button key={f} onClick={() => start(f)} className="fg-btn fg-btn-gold py-4">
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-muted">
          En uzun serin: <span className="font-display font-extrabold text-gold">{best}</span>
        </div>
      </div>
    );
  }

  // ---------- OVER ----------
  if (phase === "over") {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center space-y-6 animate-slideup">
        <div className="text-5xl">💥</div>
        <h2 className="font-display text-2xl font-extrabold">Seri bitti!</h2>
        <div className="fg-card p-6 space-y-2">
          <div className="text-sm text-muted">Toplam puanın</div>
          <div className="font-display text-5xl font-extrabold text-gold animate-countup">{points}</div>
          <div className="text-sm text-muted">
            {streak} doğru üst üste · Rekor: {best} puan
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => start(filter)} className="fg-btn fg-btn-gold flex-1">
            Tekrar Oyna
          </button>
          <button onClick={() => setPhase("menu")} className="fg-btn fg-btn-ghost flex-1">
            Kategori değiştir
          </button>
        </div>
      </div>
    );
  }

  if (!pair) return null;

  // ---------- PLAYING / REVEALED ----------
  return (
    <div className="max-w-md mx-auto px-4 py-4">
      <div className="flex items-center justify-between text-sm mb-3">
        <button onClick={() => setPhase("menu")} className="font-semibold text-muted hover:text-foreground">
          ‹ Çık
        </button>
        <div className="flex gap-3">
          <span className="px-2.5 py-1 rounded-full bg-gold/15 text-gold font-semibold">
            {points} puan
          </span>
          <span className="px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-600 font-semibold">
            🔥 {streak} seri
          </span>
        </div>
      </div>

      <p className="text-center text-foreground mb-3 font-semibold">Hangisi daha pahalı?</p>

      {phase === "playing" && (
        <div className="mb-3">
          <RoundTimer
            remaining={timer.remaining}
            progress={timer.progress}
            urgent={timer.urgent}
            total={HIGHER_LOWER_ROUND_SECONDS}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {pair.map((l, i) => (
          <CompareCard
            key={l.id}
            listing={l}
            revealed={phase === "revealed"}
            chosen={picked === i}
            isHigher={l.realPrice >= pair[1 - i].realPrice}
            onClick={() => pick(i as 0 | 1)}
          />
        ))}
      </div>

      {phase === "revealed" && wasCorrect && (
        <button onClick={next} className="fg-btn fg-btn-gold w-full mt-4 animate-slideup">
          Doğru! Devam →
        </button>
      )}
      {phase === "revealed" && timedOut && (
        <p className="mt-4 text-center text-red-600 font-semibold animate-slideup">Süre doldu ⏱️</p>
      )}
      {phase === "revealed" && !wasCorrect && !timedOut && (
        <p className="mt-4 text-center text-red-600 font-semibold animate-slideup">Yanlış seçim 😬</p>
      )}
    </div>
  );
}

function CompareCard({
  listing,
  revealed,
  chosen,
  isHigher,
  onClick,
}: {
  listing: Listing;
  revealed: boolean;
  chosen: boolean;
  isHigher: boolean;
  onClick: () => void;
}) {
  const photos = listing.photos;
  const { safeIdx, go } = usePhotoCarousel(photos, listing.id);

  const exp = expertiseInfo(listing);
  const chips = chipsFor(listing)
    .filter((c) => !c.label.startsWith("Boya") && c.label !== "Ağır hasar kayıtlı")
    .slice(0, 4);
  const ring = revealed
    ? isHigher
      ? "ring-2 ring-emerald-500"
      : chosen
      ? "ring-2 ring-red-400"
      : "ring-1 ring-black/10"
    : "ring-1 ring-black/10 hover:ring-2 hover:ring-gold";

  const goPhoto = (delta: number, e: MouseEvent) => {
    e.stopPropagation();
    go(delta);
  };

  return (
    <div
      role="button"
      tabIndex={revealed ? -1 : 0}
      onClick={revealed ? undefined : onClick}
      onKeyDown={(e) => {
        if (!revealed && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative rounded-2xl overflow-hidden bg-card shadow-sm text-left transition ${
        revealed ? "cursor-default" : "cursor-pointer active:scale-[0.98]"
      } ${ring}`}
    >
      <div className="relative aspect-square bg-black/5">
        {photos[safeIdx] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={safeIdx}
            src={photos[safeIdx]}
            alt={CATEGORY_LABELS[listing.category]}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted text-xs">Görsel yok</div>
        )}
        <span className="absolute top-2 left-2 text-[11px] bg-black/55 text-white px-2 py-0.5 rounded-full backdrop-blur">
          {CATEGORY_LABELS[listing.category]}
        </span>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => goPhoto(-1, e)}
              aria-label="Önceki fotoğraf"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white text-base grid place-items-center backdrop-blur"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => goPhoto(1, e)}
              aria-label="Sonraki fotoğraf"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white text-base grid place-items-center backdrop-blur"
            >
              ›
            </button>
            <span className="absolute top-2 right-2 text-[10px] bg-black/55 text-white px-1.5 py-0.5 rounded-full backdrop-blur">
              {safeIdx + 1}/{photos.length}
            </span>
          </>
        )}
        {revealed && (
          <div
            className={`absolute inset-x-0 bottom-0 py-2 text-center font-black text-white animate-pop ${
              isHigher ? "bg-emerald-600/95" : "bg-slate-900/85"
            }`}
          >
            {formatTRY(listing.realPrice)}
          </div>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        {chips.map((c, i) => (
          <div key={i} className="text-[11px] text-muted truncate">
            {c.icon} {c.label}
          </div>
        ))}
        {exp && (
          <div className="text-[11px] text-muted truncate" title={exp.label}>
            {exp.icon} {exp.label}
          </div>
        )}
      </div>
    </div>
  );
}
