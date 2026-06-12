"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearProfile, saveProfile, useProfile } from "@/lib/profile";
import { LogoMark } from "./Logo";

export default function EntryScreen() {
  const { profile, ready } = useProfile();
  const [name, setName] = useState("");
  const [best, setBest] = useState(0);

  useEffect(() => {
    setBest(Number(localStorage.getItem("fg_best") || 0));
  }, []);

  if (!ready) return <div className="min-h-[60vh]" />;

  const startGuest = () => {
    saveProfile({ name: name.trim() || "Misafir", provider: "guest" });
  };

  // ---------- LOGIN ----------
  if (!profile) {
    return (
      <div className="w-full max-w-md mx-auto px-5 py-10 flex flex-col items-center text-center gap-8 animate-slideup">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-floaty">
            <LogoMark size={76} />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight">
            <span className="text-foreground">Fiyat</span>
            <span className="text-brand"> Gurusu</span>
          </h1>
          <p className="text-muted max-w-xs text-[15px]">
            Gerçek ilanların fiyatını tahmin et. Ne kadar yakınsan o kadar çok puan!
          </p>
        </div>

        <div className="w-full fg-card p-6 space-y-5">
          <div className="text-left space-y-2">
            <label htmlFor="nickname" className="text-sm font-semibold text-muted">
              Takma adın
            </label>
            <input
              id="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startGuest()}
              placeholder="Örn. FiyatAvcısı"
              maxLength={20}
              autoFocus
              className="w-full bg-black/[0.03] border border-black/10 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted/70 outline-none focus:border-brand focus:bg-white transition"
            />
          </div>

          <button onClick={startGuest} className="fg-btn fg-btn-primary w-full text-lg">
            Başla
          </button>
        </div>
      </div>
    );
  }

  // ---------- HOME ----------
  return (
    <div className="w-full max-w-3xl mx-auto px-5 py-7 flex flex-col gap-7 animate-slideup">
      {/* üst bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold grid place-items-center w-11 h-11 rounded-2xl bg-brand/12 text-brand border border-brand/20">
            {profile.name.charAt(0).toUpperCase()}
          </span>
          <div className="leading-tight text-left">
            <div className="text-xs text-muted">Hoş geldin</div>
            <div className="font-bold">{profile.name}</div>
          </div>
        </div>
        <button
          onClick={clearProfile}
          className="text-sm font-semibold text-muted hover:text-foreground transition"
        >
          Çıkış
        </button>
      </div>

      {/* hero */}
      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <div className="animate-floaty">
          <LogoMark size={56} />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="text-foreground">Fiyat</span>
          <span className="text-brand"> Gurusu</span>
        </h1>
        <div className="inline-flex items-center gap-2 fg-pill">
          🏆 En yüksek skorun: <b className="text-gold font-display">{best}</b>
        </div>
      </div>

      {/* mod kartları */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-xl mx-auto w-full">
        <ModeCard
          href="/tek-oyunculu"
          icon="🎯"
          tile="bg-brand/12 text-brand"
          title="Tek Oyunculu"
          desc="Klasik tahmin & Hangisi Pahalı"
        />
        <ModeCard
          href="/cok-oyunculu"
          icon="👥"
          tile="bg-sky-400/15 text-sky-500"
          title="Çok Oyunculu"
          desc="Oda kur, arkadaşlarınla yarış (max 10)"
        />
      </div>
    </div>
  );
}

function ModeCard({
  href,
  icon,
  title,
  desc,
  tile,
  badge,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  tile: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="fg-card p-5 flex flex-col gap-3 transition hover:-translate-y-1 active:translate-y-0 group"
    >
      <span className={`text-3xl grid place-items-center w-14 h-14 rounded-2xl ${tile}`}>
        {icon}
      </span>
      <div>
        <div className="font-display font-bold text-lg flex items-center gap-2">
          {title}
          {badge && (
            <span className="text-[10px] font-sans bg-black/[0.06] text-muted px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="text-sm text-muted leading-snug mt-0.5">{desc}</div>
      </div>
      <span className="text-brand font-bold text-sm mt-auto opacity-0 group-hover:opacity-100 transition">
        Oyna →
      </span>
    </Link>
  );
}

