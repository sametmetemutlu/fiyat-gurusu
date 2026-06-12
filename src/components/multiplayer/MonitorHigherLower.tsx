"use client";

import { type MouseEvent } from "react";
import { usePhotoCarousel } from "@/hooks/usePhotoCarousel";
import RoundTimer from "../RoundTimer";
import {
  CATEGORY_LABELS,
  HIGHER_LOWER_ROUND_SECONDS,
  chipsFor,
  expertiseInfo,
} from "@/lib/game";
import type { Listing } from "@/lib/game";
import type { RoomState } from "@/lib/multiplayer";

export default function MonitorHigherLower({
  state,
  pair,
}: {
  state: RoomState;
  pair: [Omit<Listing, "realPrice">, Omit<Listing, "realPrice">];
}) {
  const urgent = state.timeLeft > 0 && state.timeLeft <= 5;

  return (
    <div className="min-h-screen bg-[#0f1419] text-white px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <span className="px-4 py-2 rounded-full bg-white/10 font-display font-bold text-lg">
            Tur {state.currentRound}/{state.totalRounds}
          </span>
          <div className="flex items-center gap-4 text-lg">
            <span className="text-white/60">
              {state.submittedCount}/{state.playerCount} seçti
            </span>
            <span className="font-display text-3xl font-extrabold text-gold tabular-nums">
              {state.timeLeft}s
            </span>
          </div>
        </div>

        <h2 className="text-center font-display text-3xl sm:text-4xl font-extrabold">
          Hangisi daha pahalı?
        </h2>

        <RoundTimer
          remaining={state.timeLeft}
          progress={state.timeLeft / HIGHER_LOWER_ROUND_SECONDS}
          urgent={urgent}
          total={HIGHER_LOWER_ROUND_SECONDS}
        />

        <div className="grid md:grid-cols-2 gap-6">
          {pair.map((l, i) => (
            <MonitorCard key={l.id} listing={l as Listing} side={i === 0 ? "SOL" : "SAĞ"} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {state.players.map((p) => (
            <span
              key={p.id}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                p.hasSubmitted ? "bg-brand/30 text-brand" : "bg-white/10 text-white/70"
              }`}
            >
              {p.name} {p.hasSubmitted ? "✓" : "…"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonitorCard({ listing, side }: { listing: Listing; side: string }) {
  const photos = listing.photos;
  const { safeIdx, go } = usePhotoCarousel(photos, listing.id);
  const chips = chipsFor(listing).slice(0, 5);
  const exp = expertiseInfo(listing);

  const goPhoto = (d: number, e: MouseEvent) => {
    e.stopPropagation();
    go(d);
  };

  return (
    <div className="rounded-3xl overflow-hidden bg-white/5 border border-white/10">
      <div className="px-4 py-2 bg-white/10 font-display font-extrabold text-xl text-center">{side}</div>
      <div className="relative w-full aspect-[4/3] bg-black/30">
        {photos[safeIdx] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[safeIdx]}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white/40">Görsel yok</div>
        )}
        <span className="absolute top-3 left-3 text-sm bg-black/60 text-white px-3 py-1 rounded-full">
          {CATEGORY_LABELS[listing.category]}
        </span>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => goPhoto(-1, e)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white text-xl"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => goPhoto(1, e)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white text-xl"
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        {chips.map((c, i) => (
          <div key={i} className="text-base text-white/80 truncate">
            {c.icon} {c.label}
          </div>
        ))}
        {exp && (
          <div className="text-base text-white/60 truncate">
            {exp.icon} {exp.label}
          </div>
        )}
      </div>
    </div>
  );
}
