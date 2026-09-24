import { NextResponse } from "next/server";
import { scoreClassic, scorePair } from "@/lib/catalogServer";
import { requestIp, tooMany } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (tooMany(requestIp(req), "score", 80, 60_000)) {
    return NextResponse.json({ ok: false, error: "Çok fazla istek" }, { status: 429 });
  }
  const raw = await req.text();
  if (raw.length > 2000) {
    return NextResponse.json({ ok: false, error: "İstek çok büyük" }, { status: 413 });
  }
  let body: { kind?: unknown; seal?: unknown; seals?: unknown; guess?: unknown; pick?: unknown; timeLeft?: unknown; timedOut?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "İstek okunamadı" }, { status: 400 });
  }
  const timedOut = body.timedOut === true;

  try {
    if (body.kind === "classic") {
      if (typeof body.seal !== "string") {
        return NextResponse.json({ ok: false, error: "Tur geçersiz" }, { status: 400 });
      }
      const scored = scoreClassic(body.seal, body.guess, body.timeLeft, timedOut);
      if (!scored) return NextResponse.json({ ok: false, error: "Tur geçersiz" }, { status: 400 });
      if ("error" in scored) return NextResponse.json({ ok: false, error: scored.error }, { status: 400 });
      return NextResponse.json({ ok: true, ...scored }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.kind === "higherlower") {
      const scored = scorePair(body.seals, body.pick, body.timeLeft, timedOut);
      if (!scored) return NextResponse.json({ ok: false, error: "Tur geçersiz" }, { status: 400 });
      if ("error" in scored) return NextResponse.json({ ok: false, error: scored.error }, { status: 400 });
      return NextResponse.json({ ok: true, ...scored }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: false, error: "Mod geçersiz" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Sunucu ayarı eksik" }, { status: 500 });
  }
}
