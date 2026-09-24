import { NextResponse } from "next/server";
import { playableCounts } from "@/lib/catalogServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true, counts: playableCounts() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
