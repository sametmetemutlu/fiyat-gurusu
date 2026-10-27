import { NextResponse } from "next/server";
import { requestIp, tooMany } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set(["imaj.emlakjet.com", "arbstorage.mncdn.com"]);
const MAX_BYTES = 6_000_000;

export async function GET(req: Request) {
  if (tooMany(requestIp(req), "photo", 180, 60_000)) {
    return new NextResponse(null, { status: 429 });
  }

  const src = new URL(req.url).searchParams.get("src") || "";
  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse(null, { status: 403 });
  }

  try {
    const upstream = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "image/avif,image/webp,image/*,*/*", "User-Agent": "PiyasaGurusu/1.0" },
    });
    if (!upstream.ok || !upstream.body) return new NextResponse(null, { status: 502 });
    const type = upstream.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return new NextResponse(null, { status: 502 });
    const length = Number(upstream.headers.get("content-length") || 0);
    if (length > MAX_BYTES) return new NextResponse(null, { status: 502 });

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 504 });
  }
}
