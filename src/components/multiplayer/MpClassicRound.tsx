"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import PhotoGallery from "../PhotoGallery";
import RoundTimer from "../RoundTimer";
import { CATEGORY_LABELS, CLASSIC_ROUND_SECONDS, chipsFor, formatTRY } from "@/lib/game";
import type { Listing } from "@/lib/game";
import type { RoomState } from "@/lib/multiplayer";

export default function MpClassicRound({
  state,
  listing,
  slider,
  socket,
  onError,
  monitorMode = false,
}: {
  state: RoomState;
  listing?: Omit<Listing, "realPrice"> | null;
  slider: { min: number; max: number; step: number };
  socket: Socket | null;
  onError: (msg: string) => void;
  monitorMode?: boolean;
}) {
  const [guess, setGuess] = useState(() => Math.round((slider.min + slider.max) / 2 / 1000) * 1000);
  const you = state.players.find((p) => p.isYou);
  const submitted = you?.hasSubmitted ?? false;

  useEffect(() => {
    setGuess(Math.round((slider.min + slider.max) / 2 / 1000) * 1000);
  }, [state.currentRound, slider.min, slider.max]);

  const submit = () => {
    if (!socket || submitted) return;
    socket.emit("submit_guess", { value: guess }, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) onError(res?.error || "Gönderilemedi");
    });
  };

  const urgent = state.timeLeft > 0 && state.timeLeft <= 5;
  const fullListing = listing as Listing | undefined;
  const chips = fullListing ? chipsFor(fullListing) : [];

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {!monitorMode && (
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="px-2.5 py-1 rounded-full bg-black/[0.05] text-foreground font-medium">
            İlan {state.currentRound}/{state.totalRounds}
          </span>
          {fullListing && (
            <span className="px-2.5 py-1 rounded-full bg-brand/15 text-brand font-medium">
              {CATEGORY_LABELS[fullListing.category]}
            </span>
          )}
          <span className="text-xs text-muted">
            {state.submittedCount}/{state.playerCount} gönderdi
          </span>
        </div>
      )}

      {monitorMode ? (
        <div className="text-center mb-4 space-y-1">
          <div className="text-4xl">📺</div>
          <p className="font-display font-bold text-lg">Büyük ekrana bak!</p>
          <p className="text-sm text-muted">İlan fotoğrafları TV&apos;de gösteriliyor</p>
        </div>
      ) : (
        <>
          <RoundTimer
            remaining={state.timeLeft}
            progress={state.timeLeft / CLASSIC_ROUND_SECONDS}
            urgent={urgent}
            total={CLASSIC_ROUND_SECONDS}
          />
          {fullListing && (
            <>
              <PhotoGallery
                photos={fullListing.photos}
                alt={CATEGORY_LABELS[fullListing.category]}
                resetKey={fullListing.id}
              />
              <div className="flex flex-wrap gap-2 mt-4">
                {chips.map((c, i) => (
                  <span key={i} className="fg-pill">
                    <span>{c.icon}</span>
                    {c.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {monitorMode && (
        <RoundTimer
          remaining={state.timeLeft}
          progress={state.timeLeft / CLASSIC_ROUND_SECONDS}
          urgent={urgent}
          total={CLASSIC_ROUND_SECONDS}
        />
      )}

      <div className={`fg-card p-5 space-y-4 ${monitorMode ? "mt-4" : "mt-5"}`}>
        {submitted ? (
          <div className="text-center py-4 space-y-1">
            <div className="text-2xl">✓</div>
            <p className="font-semibold text-brand">Tahminin gönderildi!</p>
            <p className="text-sm text-muted">Diğer oyuncuları bekliyoruz…</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <div className="text-sm text-muted">Tahminin</div>
              <div className="font-display text-3xl font-extrabold text-brand">{formatTRY(guess)}</div>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={Math.min(slider.max, Math.max(slider.min, guess))}
              onChange={(e) => setGuess(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>{formatTRY(slider.min)}</span>
              <span>{formatTRY(slider.max)}</span>
            </div>
            <button onClick={submit} className="fg-btn fg-btn-primary w-full">
              Tahmin Et
            </button>
          </>
        )}
      </div>
    </div>
  );
}
