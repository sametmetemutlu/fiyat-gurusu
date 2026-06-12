"use client";

import { type MouseEvent } from "react";
import { usePhotoCarousel } from "@/hooks/usePhotoCarousel";
import type { Socket } from "socket.io-client";
import RoundTimer from "../RoundTimer";
import {
  CATEGORY_LABELS,
  HIGHER_LOWER_ROUND_SECONDS,
  chipsFor,
  expertiseInfo,
} from "@/lib/game";
import type { Listing } from "@/lib/game";
import type { RoomState } from "@/lib/multiplayer";

export default function MpHigherLowerRound({
  state,
  pair,
  socket,
  onError,
}: {
  state: RoomState;
  pair: [Omit<Listing, "realPrice">, Omit<Listing, "realPrice">];
  socket: Socket | null;
  onError: (msg: string) => void;
}) {
  const you = state.players.find((p) => p.isYou);
  const submitted = you?.hasSubmitted ?? false;
  const urgent = state.timeLeft > 0 && state.timeLeft <= 5;

  const pick = (side: 0 | 1) => {
    if (!socket || submitted) return;
    socket.emit("submit_pick", { side }, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) onError(res?.error || "Gönderilemedi");
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="px-2.5 py-1 rounded-full bg-black/[0.05] text-foreground font-medium">
          Tur {state.currentRound}/{state.totalRounds}
        </span>
        <span className="text-xs text-muted">
          {state.submittedCount}/{state.playerCount} seçti
        </span>
      </div>

      <RoundTimer
        remaining={state.timeLeft}
        progress={state.timeLeft / HIGHER_LOWER_ROUND_SECONDS}
        urgent={urgent}
        total={HIGHER_LOWER_ROUND_SECONDS}
      />

      <p className="text-center text-foreground mb-3 font-semibold">Hangisi daha pahalı?</p>

      {submitted ? (
        <div className="fg-card p-6 text-center space-y-1 mb-3">
          <div className="text-2xl">✓</div>
          <p className="font-semibold text-gold">Seçimin gönderildi!</p>
          <p className="text-sm text-muted">Diğer oyuncuları bekliyoruz…</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {pair.map((l, i) => (
          <CompareCard
            key={l.id}
            listing={l as Listing}
            disabled={submitted}
            onClick={() => pick(i as 0 | 1)}
          />
        ))}
      </div>
    </div>
  );
}

function CompareCard({
  listing,
  disabled,
  onClick,
}: {
  listing: Listing;
  disabled: boolean;
  onClick: () => void;
}) {
  const photos = listing.photos;
  const { safeIdx, go } = usePhotoCarousel(photos, listing.id);

  const exp = expertiseInfo(listing);
  const chips = chipsFor(listing)
    .filter((c) => !c.label.startsWith("Boya") && c.label !== "Ağır hasar kayıtlı")
    .slice(0, 4);

  const goPhoto = (d: number, e: MouseEvent) => {
    e.stopPropagation();
    go(d);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      className={`relative rounded-2xl overflow-hidden bg-card shadow-sm text-left ring-1 ring-black/10 transition ${
        disabled ? "opacity-70 cursor-default" : "cursor-pointer hover:ring-2 hover:ring-gold active:scale-[0.98]"
      }`}
    >
      <div className="relative aspect-square bg-black/5">
        {photos[safeIdx] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[safeIdx]} alt="" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted text-xs">Görsel yok</div>
        )}
        <span className="absolute top-2 left-2 text-[11px] bg-black/55 text-white px-2 py-0.5 rounded-full">
          {CATEGORY_LABELS[listing.category]}
        </span>
        {photos.length > 1 && !disabled && (
          <>
            <button
              type="button"
              onClick={(e) => goPhoto(-1, e)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white grid place-items-center"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => goPhoto(1, e)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white grid place-items-center"
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        {chips.map((c, i) => (
          <div key={i} className="text-[11px] text-muted truncate">
            {c.icon} {c.label}
          </div>
        ))}
        {exp && (
          <div className="text-[11px] text-muted truncate">
            {exp.icon} {exp.label}
          </div>
        )}
      </div>
    </div>
  );
}
