"use client";

import { MP_MODE_LABELS, type MpMode, type RoomState } from "@/lib/multiplayer";
import { CLASSIC_MP_LISTING_OPTIONS, HL_MP_ROUND_OPTIONS, type CategoryFilter } from "@/lib/game";

export default function MpLobby({
  state,
  error,
  copied,
  onUpdateConfig,
  onStart,
  onLeave,
  onCopyInvite,
}: {
  state: RoomState;
  error: string;
  copied: boolean;
  onUpdateConfig: (p: { mode?: MpMode; category?: CategoryFilter; rounds?: number }) => void;
  onStart: () => void;
  onLeave: () => void;
  onCopyInvite: () => void;
}) {
  const copyCode = () => {
    navigator.clipboard?.writeText(state.code);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5 animate-slideup">
      <div className="flex items-center justify-between">
        <button onClick={onLeave} className="text-sm font-semibold text-muted hover:text-foreground">
          ‹ Çık
        </button>
        <span className="text-sm text-muted">{state.playerCount}/10 oyuncu</span>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted">Oda kodu</p>
        <button
          onClick={copyCode}
          className="font-display text-4xl font-extrabold tracking-[0.25em] text-brand hover:opacity-80"
          title="Kopyala"
        >
          {state.code}
        </button>
        <p className="text-xs text-muted">Koda tıkla → kodu kopyala</p>
        <button onClick={onCopyInvite} className="fg-btn fg-btn-ghost w-full text-sm py-2">
          {copied ? "Link kopyalandı! ✓" : "🔗 Davet linkini kopyala"}
        </button>
      </div>

      {state.isHost ? (
        <div className="fg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-muted">Oyun ayarları (host)</p>
          <div className="grid grid-cols-2 gap-2">
            {(["classic", "higherlower"] as MpMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onUpdateConfig({ mode: m })}
                className={`rounded-2xl py-3 px-2 text-sm font-semibold border transition ${
                  state.config.mode === m
                    ? "bg-gold/15 border-gold text-foreground"
                    : "bg-black/[0.03] border-black/10 text-muted"
                }`}
              >
                {MP_MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["ALL", "🎲 Hepsi"],
              ["CAR", "🚗 Araba"],
              ["HOUSE", "🏠 Ev"],
            ] as [CategoryFilter, string][]).map(([f, label]) => (
              <button
                key={f}
                onClick={() => onUpdateConfig({ category: f })}
                className={`rounded-xl py-2.5 text-xs font-semibold border transition ${
                  state.config.category === f
                    ? "bg-brand/12 border-brand text-foreground"
                    : "bg-black/[0.03] border-black/10 text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">
              {state.config.mode === "classic" ? "İlan sayısı" : "Tur sayısı"}
            </span>
            <div className="flex gap-1">
              {(state.config.mode === "classic" ? CLASSIC_MP_LISTING_OPTIONS : HL_MP_ROUND_OPTIONS).map(
                (n) => (
                  <button
                    key={n}
                    onClick={() => onUpdateConfig({ rounds: n })}
                    className={`w-10 h-10 rounded-xl font-bold text-sm border transition ${
                      state.config.rounds === n
                        ? "bg-brand text-white border-brand"
                        : "bg-black/[0.03] border-black/10 text-muted"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}
            </div>
          </div>
          <button
            onClick={onStart}
            disabled={state.playerCount < 2}
            className="fg-btn fg-btn-primary w-full"
          >
            {state.playerCount < 2 ? "En az 2 oyuncu bekle…" : "Oyunu Başlat"}
          </button>
        </div>
      ) : (
        <div className="fg-card p-5 text-center space-y-2">
          {state.monitorMode && (
            <p className="text-brand font-semibold text-sm">📺 Monitör modu — büyük ekrana bak</p>
          )}
          <p className="text-muted text-sm">Host oyunu başlatmayı bekliyor…</p>
          <p className="font-semibold">
            {MP_MODE_LABELS[state.config.mode]} •{" "}
            {state.config.mode === "classic"
              ? `${state.config.rounds} ilan`
              : `${state.config.rounds} tur`}
          </p>
        </div>
      )}

      <div className="fg-card p-4 space-y-2">
        <p className="text-sm font-semibold text-muted mb-2">Oyuncular</p>
        {state.players.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm py-1">
            <span className={p.isYou ? "font-bold text-brand" : p.offline ? "text-muted" : "text-foreground"}>
              {p.name} {p.isYou && "(sen)"} {p.isHost && "👑"}
            </span>
            {p.offline && <span className="text-xs text-muted">çevrimdışı</span>}
          </div>
        ))}
      </div>

      {error && <p className="text-center text-red-600 text-sm font-semibold">{error}</p>}
    </div>
  );
}
