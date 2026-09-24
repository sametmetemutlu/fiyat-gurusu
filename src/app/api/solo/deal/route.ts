import { NextResponse } from "next/server";
import { dealClassic, dealPair } from "@/lib/catalogServer";
import { requestIp, tooMany } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (tooMany(requestIp(req), "deal", 40, 60_000)) {
    return NextResponse.json({ ok: false, error: "Çok fazla istek" }, { status: 429 });
  }
  const raw = await req.text();
  if (raw.length > 200) {
    return NextResponse.json({ ok: false, error: "İstek çok büyük" }, { status: 413 });
  }
  let body: { mode?: unknown; category?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "İstek okunamadı" }, { status: 400 });
  }
  const category = body.category;
  if (category !== "ALL" && category !== "CAR" && category !== "HOUSE") {
    return NextResponse.json({ ok: false, error: "Kategori geçersiz" }, { status: 400 });
  }

  try {
    if (body.mode === "classic") {
      const rounds = dealClassic(category);
      if (!rounds.length) return NextResponse.json({ ok: false, error: "Yeterli ilan yok" }, { status: 404 });
      return NextResponse.json({ ok: true, rounds }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.mode === "higherlower") {
      const pair = dealPair(category);
      if (!pair) return NextResponse.json({ ok: false, error: "Yeterli ilan yok" }, { status: 404 });
      return NextResponse.json({ ok: true, pair }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: false, error: "Mod geçersiz" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu ayarı eksik" }, { status: 500 });
  }
}
