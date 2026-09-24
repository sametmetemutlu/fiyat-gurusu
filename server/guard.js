"use strict";

const MAX_ROOMS = 300;
const MAX_ROOMS_PER_IP = 5;
const MAX_CONNECTIONS_PER_IP = 8;
const WINDOW_MS = 60_000;
const MAX_CREATES_PER_WINDOW = 4;
const MAX_JOINS_PER_WINDOW = 20;

class Guard {
  constructor() {
    /** @type {Map<string, Set<string>>} */
    this.roomsByIp = new Map();
    /** @type {Map<string, string>} */
    this.roomIp = new Map();
    /** @type {Map<string, number[]>} */
    this.creates = new Map();
    /** @type {Map<string, number[]>} */
    this.joins = new Map();
    /** @type {Map<string, number>} */
    this.conns = new Map();
  }

  allowConnection(ip) {
    const n = this.conns.get(ip) || 0;
    if (n >= MAX_CONNECTIONS_PER_IP) return false;
    this.conns.set(ip, n + 1);
    return true;
  }

  releaseConnection(ip) {
    const n = (this.conns.get(ip) || 1) - 1;
    if (n <= 0) this.conns.delete(ip);
    else this.conns.set(ip, n);
  }

  canCreate(ip, totalRooms) {
    if (totalRooms >= MAX_ROOMS) return "Sunucu dolu, biraz sonra tekrar dene";
    const owned = this.roomsByIp.get(ip);
    if (owned && owned.size >= MAX_ROOMS_PER_IP) return "Çok fazla açık odan var";
    if (!this._allow(this.creates, ip, MAX_CREATES_PER_WINDOW)) return "Çok hızlı oda açıyorsun";
    return null;
  }

  canJoin(ip) {
    if (!this._allow(this.joins, ip, MAX_JOINS_PER_WINDOW)) return "Çok fazla katılma denemesi";
    return null;
  }

  track(ip, code) {
    let set = this.roomsByIp.get(ip);
    if (!set) {
      set = new Set();
      this.roomsByIp.set(ip, set);
    }
    set.add(code);
    this.roomIp.set(code, ip);
  }

  release(code) {
    const ip = this.roomIp.get(code);
    if (!ip) return;
    this.roomIp.delete(code);
    const set = this.roomsByIp.get(ip);
    if (!set) return;
    set.delete(code);
    if (set.size === 0) this.roomsByIp.delete(ip);
  }

  _allow(map, ip, max) {
    const now = Date.now();
    const recent = (map.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= max) {
      map.set(ip, recent);
      return false;
    }
    recent.push(now);
    map.set(ip, recent);
    return true;
  }
}

function clientIp(socket) {
  if (process.env.TRUST_PROXY === "1") {
    const fwd = socket.handshake.headers["x-forwarded-for"];
    if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim().slice(0, 64);
  }
  return String(socket.handshake.address || "unknown").slice(0, 64);
}

function corsOrigins() {
  const raw = process.env.MP_CORS_ORIGIN;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      console.error("MP_CORS_ORIGIN gerekli. Örnek: https://sametmetemutlu.com");
      process.exit(1);
    }
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (process.env.NODE_ENV === "production" && list.some((origin) => !origin.startsWith("https://"))) {
    console.error("MP_CORS_ORIGIN yalnızca https:// adresi olabilir");
    process.exit(1);
  }
  return list;
}

module.exports = { Guard, clientIp, corsOrigins };
