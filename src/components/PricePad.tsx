"use client";

import { useEffect, useRef } from "react";
import { formatTRY, priceToTick, tickToPrice } from "@/lib/game";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "⌫"] as const;

export default function PricePad({
  min,
  max,
  value,
  onChange,
  resetKey,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
  resetKey: string;
}) {
  const valueRef = useRef(value);
  const replaceRef = useRef(true);

  useEffect(() => {
    valueRef.current = value;
    replaceRef.current = true;
    // Yeni turda önerilen fiyat değişir; rakamlar o değeri silip baştan yazılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const commit = (n: number, replaceAfter: boolean) => {
    valueRef.current = n;
    replaceRef.current = replaceAfter;
    onChange(n);
  };

  const push = (chunk: string) => {
    const current = valueRef.current;
    const raw = replaceRef.current || current <= 0 ? chunk : String(current) + chunk;
    const trimmed = raw.replace(/^0+/, "") || "0";
    if (trimmed.length > 9) return;
    let n = Number(trimmed);
    if (!Number.isFinite(n)) return;
    if (n > max) n = max;
    commit(n, false);
  };

  const backspace = () => {
    const next = String(valueRef.current).slice(0, -1);
    commit(Number(next || "0"), false);
  };

  const clear = () => {
    commit(0, true);
  };

  const thumb = priceToTick(value > 0 ? value : min, min, max);

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-sm text-muted">Tahminin</div>
        <div className="font-display text-3xl font-extrabold text-brand">
          {value > 0 ? formatTRY(value) : "0 TL"}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={1000}
        step={1}
        value={thumb}
        aria-label="Fiyat çubuğu"
        onChange={(e) => {
          commit(tickToPrice(Number(e.target.value), min, max), true);
        }}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted">
        <span>{formatTRY(min)}</span>
        <span>{formatTRY(max)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => (k === "⌫" ? backspace() : push(k))}
            className="h-12 lg:h-11 rounded-2xl bg-black/[0.04] border border-black/10 font-display text-lg font-bold text-foreground active:bg-brand/15 active:border-brand/40 transition"
          >
            {k}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={clear}
        className="w-full h-11 rounded-2xl text-sm font-semibold text-muted hover:text-foreground hover:bg-black/[0.04] transition"
      >
        Temizle
      </button>
    </div>
  );
}
