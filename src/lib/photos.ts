const ALLOWED_PHOTO_HOSTS = new Set(["imaj.emlakjet.com", "arbstorage.mncdn.com"]);

/** İlan fotoğrafı kendi sunucumuzdan açılır. Dış adres tarayıcıya doğrudan gitmez. */
export function photoSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("/api/photo?")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !ALLOWED_PHOTO_HOSTS.has(parsed.hostname)) return "";
    return `/api/photo?src=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return "";
  }
}
