"use client";

import { useEffect, useState } from "react";
import { formatTRY } from "@/lib/game";
import type { ClassicRevealRow, HlRevealRow, MpReveal, RoomState } from "@/lib/multiplayer";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function MpReveal({ state, reveal }: { state: RoomState; reveal: MpReveal }) {
  const [countdown, setCountdown] = useState(state.revealSeconds || 5);

  useEffect(() => {
    setCountdown(state.revealSeconds || 5);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [state.currentRound, state.revealSeconds]);

  return (
    <div className="max-w-md mx-auto px-4 py-6 animate-slideup">
      <div className="text-center mb-4">
        <p className="text-sm text-muted">
          {state.config.mode === "classic" ? `İlan ${state.currentRound}` : `Tur ${state.currentRound}`} sonuçları
        </p>
        <h2 className="font-display text-2xl font-extrabold">Sıralama</h2>
        <p className="text-xs text-muted mt-1">
          Sonraki tur <b className="text-brand">{countdown}</b> sn içinde…
        </p>
      </div>

      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden mb-4">
        <div
          className="h-full bg-brand rounded-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${((state.revealSeconds || 5) > 0 ? countdown / (state.revealSeconds || 5) : 0) * 100}%`,
          }}
        />
      </div>

      <div className="fg-card p-5 space-y-3">
        {reveal.type === "classic" ? (
          <>
            <div className="text-center pb-3 border-b border-black/10">
              <p className="text-sm text-muted">Gerçek fiyat</p>
              <p className="font-display text-3xl font-extrabold text-gold">
                {formatTRY(reveal.realPrice ?? 0)}
              </p>
            </div>
            {(reveal.rankings as ClassicRevealRow[]).map((r) => (
              <div
                key={r.playerId}
                className={`flex items-center gap-3 py-2 ${
                  r.rank === 1 ? "text-brand font-semibold" : "text-foreground"
                }`}
              >
                <span className="w-6 text-center">{MEDALS[r.rank - 1] || `${r.rank}.`}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted">
                    {r.timedOut ? "Süre doldu" : formatTRY(r.guess ?? 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-display font-bold text-brand tabular-nums">+{r.points}</div>
                  <div className="text-[11px] text-muted">
                    {r.timedOut ? "—" : `${r.tierCode} · %${r.deviation.toFixed(1)}`}
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="text-center pb-3 border-b border-black/10 text-sm space-y-1">
              <p>
                Sol: <b>{formatTRY(reveal.prices?.[0] ?? 0)}</b> • Sağ:{" "}
                <b>{formatTRY(reveal.prices?.[1] ?? 0)}</b>
              </p>
              <p className="text-muted">
                Pahalı olan: <b className="text-foreground">{reveal.higherSide === 0 ? "Sol" : "Sağ"}</b>
              </p>
            </div>
            {(reveal.rankings as HlRevealRow[]).map((r) => (
              <div
                key={r.playerId}
                className={`flex items-center gap-3 py-2 ${
                  r.correct ? "text-brand font-semibold" : "text-foreground"
                }`}
              >
                <span className="w-6 text-center">{MEDALS[r.rank - 1] || `${r.rank}.`}</span>
                <div className="flex-1 truncate font-medium">{r.name}</div>
                <div className="text-sm text-right">
                  <div className="font-display font-bold text-brand">+{r.points}</div>
                  <div className="text-[11px] text-muted">
                    {r.timedOut ? "⏱️" : r.correct ? "✅" : "❌"}
                    {!r.timedOut && ` ${r.pick === 0 ? "Sol" : "Sağ"}`}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
