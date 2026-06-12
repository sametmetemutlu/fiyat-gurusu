"use client";

import { QRCodeSVG } from "qrcode.react";
import { MP_MODE_LABELS, roomInviteUrl, type MpMode, type RoomState } from "@/lib/multiplayer";
import { CLASSIC_MP_LISTING_OPTIONS, HL_MP_ROUND_OPTIONS, type CategoryFilter } from "@/lib/game";

export default function MonitorLobby({
  state,
  error,
  onUpdateConfig,
  onStart,
  onLeave,
}: {
  state: RoomState;
  error: string;
  onUpdateConfig: (p: { mode?: MpMode; category?: CategoryFilter; rounds?: number }) => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const inviteUrl = roomInviteUrl(state.code);

  return (
    <div className="min-h-screen bg-[#0f1419] text-white px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={onLeave} className="text-white/50 hover:text-white text-sm font-semibold">
            ‹ Kapat
          </button>
          <span className="text-white/50 text-sm">{state.playerCount}/10 oyuncu</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-center space-y-6">
            <p className="text-white/60 uppercase tracking-widest text-sm">Katılmak için QR okut</p>
            <div className="inline-block p-4 bg-white rounded-3xl shadow-2xl">
              <QRCodeSVG value={inviteUrl} size={220} level="M" />
            </div>
            <div>
              <p className="text-white/60 text-sm mb-2">veya kodu gir</p>
              <p className="font-display text-5xl sm:text-6xl font-extrabold tracking-[0.2em] text-brand">
                {state.code}
              </p>
            </div>
            <p className="text-white/40 text-xs break-all">{inviteUrl}</p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 space-y-5">
              <p className="font-semibold text-white/80">Oyun ayarları</p>
              <div className="grid grid-cols-2 gap-2">
                {(["classic", "higherlower"] as MpMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => onUpdateConfig({ mode: m })}
                    className={`rounded-2xl py-3 px-2 text-sm font-semibold border transition ${
                      state.config.mode === m
                        ? "bg-gold/20 border-gold text-white"
                        : "bg-white/5 border-white/10 text-white/60"
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
                        ? "bg-brand/30 border-brand text-white"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/60">
                  {state.config.mode === "classic" ? "İlan sayısı" : "Tur sayısı"}
                </span>
                <div className="flex gap-1">
                  {(state.config.mode === "classic" ? CLASSIC_MP_LISTING_OPTIONS : HL_MP_ROUND_OPTIONS).map(
                    (n) => (
                      <button
                        key={n}
                        onClick={() => onUpdateConfig({ rounds: n })}
                        className={`w-11 h-11 rounded-xl font-bold text-sm border transition ${
                          state.config.rounds === n
                            ? "bg-brand text-white border-brand"
                            : "bg-white/5 border-white/10 text-white/60"
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
                className="w-full py-4 rounded-2xl bg-brand text-white font-display text-lg font-extrabold disabled:opacity-40"
              >
                {state.playerCount < 2 ? "En az 2 oyuncu bekle…" : "Oyunu Başlat"}
              </button>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
              <p className="text-sm font-semibold text-white/60 mb-3">Oyuncular</p>
              {state.players.length === 0 ? (
                <p className="text-white/40 text-sm">Henüz kimse katılmadı…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {state.players.map((p) => (
                    <span
                      key={p.id}
                      className="px-3 py-1.5 rounded-full bg-white/10 text-sm font-medium"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-center text-red-400 font-semibold">{error}</p>}
      </div>
    </div>
  );
}
