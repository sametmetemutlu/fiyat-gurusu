import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const TTL_MS = 3 * 60 * 60 * 1000;

function key(): Buffer {
  const fromEnv = process.env.ROUND_SECRET;
  const secret =
    fromEnv && fromEnv.length >= 16
      ? fromEnv
      : process.env.NODE_ENV === "production"
        ? ""
        : "dev-round-secret-not-for-production";
  if (!secret) throw new Error("ROUND_SECRET gerekli");
  return createHash("sha256").update(secret).digest();
}

/** İlan kimliğini oyuncunun okuyamayacağı bir mühüre koyar. */
export function sealListingId(id: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const payload = Buffer.from(JSON.stringify({ id, exp: Date.now() + TTL_MS }));
  const enc = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function openListingId(seal: string): string | null {
  if (typeof seal !== "string" || seal.length < 20 || seal.length > 400) return null;
  try {
    const buf = Buffer.from(seal, "base64url");
    if (buf.length < 30) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString();
    const data = JSON.parse(json) as { id?: unknown; exp?: unknown };
    if (typeof data.id !== "string" || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data.id;
  } catch {
    return null;
  }
}
