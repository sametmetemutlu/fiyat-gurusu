"use client";

import { useState } from "react";
import Game from "./Game";
import HigherLower from "./HigherLower";

type Mode = "menu" | "classic" | "higherlower";

export default function SinglePlayerHub() {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "classic") return <Game onExit={() => setMode("menu")} />;
  if (mode === "higherlower") return <HigherLower onExit={() => setMode("menu")} />;

  return (
    <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-5 animate-slideup">
      <div className="text-center space-y-1">
        <h2 className="font-display text-3xl font-extrabold">Tek Oyunculu</h2>
        <p className="text-muted text-sm">Bir oyun türü seç</p>
      </div>

      <button
        onClick={() => setMode("classic")}
        className="fg-card px-5 py-5 flex items-center gap-4 text-left transition hover:-translate-y-0.5 active:translate-y-0"
      >
        <span className="text-2xl grid place-items-center w-14 h-14 rounded-2xl bg-brand/12 text-brand">
          🎯
        </span>
        <div className="flex-1">
          <div className="font-display font-bold text-foreground text-lg">Klasik</div>
          <div className="text-sm text-muted">
            Sırayla ilanların fiyatını tahmin et (araba + ev)
          </div>
        </div>
        <span className="text-muted text-xl">›</span>
      </button>

      <button
        onClick={() => setMode("higherlower")}
        className="fg-card px-5 py-5 flex items-center gap-4 text-left transition hover:-translate-y-0.5 active:translate-y-0"
      >
        <span className="text-2xl grid place-items-center w-14 h-14 rounded-2xl bg-gold/15 text-gold">
          ⚖️
        </span>
        <div className="flex-1">
          <div className="font-display font-bold text-foreground text-lg">Hangisi Pahalı?</div>
          <div className="text-sm text-muted">İki ilandan pahalı olanı seç, seriyi koru</div>
        </div>
        <span className="text-muted text-xl">›</span>
      </button>
    </div>
  );
}
