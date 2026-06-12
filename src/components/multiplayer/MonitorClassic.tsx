"use client";

import PhotoGallery from "../PhotoGallery";
import RoundTimer from "../RoundTimer";
import { CATEGORY_LABELS, CLASSIC_ROUND_SECONDS, chipsFor } from "@/lib/game";
import type { Listing } from "@/lib/game";
import type { RoomState } from "@/lib/multiplayer";

export default function MonitorClassic({
  state,
  listing,
}: {
  state: RoomState;
  listing: Omit<Listing, "realPrice">;
}) {
  const full = listing as Listing;
  const chips = chipsFor(full);
  const urgent = state.timeLeft > 0 && state.timeLeft <= 5;

  return (
    <div className="min-h-screen bg-[#0f1419] text-white px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-full bg-white/10 font-display font-bold text-lg">
              İlan {state.currentRound}/{state.totalRounds}
            </span>
            <span className="px-4 py-2 rounded-full bg-brand/30 text-brand font-semibold">
              {CATEGORY_LABELS[full.category]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-lg">
            <span className="text-white/60">
              {state.submittedCount}/{state.playerCount} cevapladı
            </span>
            <span className="font-display text-3xl font-extrabold text-gold tabular-nums">
              {state.timeLeft}s
            </span>
          </div>
        </div>

        <RoundTimer
          remaining={state.timeLeft}
          progress={state.timeLeft / CLASSIC_ROUND_SECONDS}
          urgent={urgent}
          total={CLASSIC_ROUND_SECONDS}
        />

        <PhotoGallery photos={full.photos} alt={CATEGORY_LABELS[full.category]} resetKey={full.id} />

        <div className="flex flex-wrap gap-3 justify-center">
          {chips.map((c, i) => (
            <span key={i} className="px-4 py-2 rounded-full bg-white/10 text-base font-medium">
              {c.icon} {c.label}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center pt-2">
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
