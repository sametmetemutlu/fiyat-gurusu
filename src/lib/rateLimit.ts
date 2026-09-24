const hits = new Map<string, number[]>();

export function tooMany(ip: string, bucket: string, max: number, windowMs: number): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function requestIp(req: Request): string {
  if (process.env.TRUST_PROXY === "1") {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  }
  return (req.headers.get("x-real-ip") || "local").slice(0, 64);
}
