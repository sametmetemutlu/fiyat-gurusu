"use client";

import type { RoomState } from "@/lib/multiplayer";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function MpGameOver({
  state,
  onLeave,
  onPlayAgain,
}: {
  state: RoomState;
  onLeave: () => void;
  onPlayAgain?: () => void;
}) {
  const winner = state.finalRankings?.[0];

  return (
    <div className="max-w-md mx-auto px-4 py-10 text-center space-y-6 animate-slideup">
      <div className="text-5xl">🏆</div>
      <div>
        <h2 className="font-display text-2xl font-extrabold">Oyun bitti!</h2>
        {winner && (
          <p className="text-muted mt-1">
            Şampiyon: <b className="text-gold">{winner.name}</b> ({winner.roundWins} tur)
          </p>
        )}
      </div>

      <div className="fg-card p-5 space-y-2 text-left">
        {state.finalRankings?.map((r) => (
          <div
            key={r.playerId}
            className={`flex items-center gap-3 py-2 ${
              r.rank === 1 ? "text-brand font-bold" : "text-foreground"
            }`}
          >
            <span className="w-8 text-center text-lg">{MEDALS[r.rank - 1] || `${r.rank}.`}</span>
            <span className="flex-1 truncate">{r.name}</span>
            <span className="font-display font-bold">{r.roundWins} tur</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {onPlayAgain && (
          <button onClick={onPlayAgain} className="fg-btn fg-btn-gold w-full">
            Tekrar Oyna (host)
          </button>
        )}
        {!onPlayAgain && (
          <p className="text-sm text-muted">Host tekrar başlatabilir…</p>
        )}
        <button onClick={onLeave} className="fg-btn fg-btn-ghost w-full">
          Odadan ayrıl
        </button>
      </div>
    </div>
  );
}
