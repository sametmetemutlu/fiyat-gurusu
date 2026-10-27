"use client";

import { useEffect, useState } from "react";
import { photoSrc } from "@/lib/photos";

const PHOTO_WAIT_MS = 8000;
const MAX_PHOTO_INDEX = 3;

export function usePhotoCarousel(photos: string[], resetKey?: string) {
  const [idx, setIdx] = useState(0);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(photos.length ? "loading" : "failed");

  const safeIdx = Math.min(idx, Math.max(0, photos.length - 1));

  useEffect(() => {
    setIdx(0);
    setRetry(0);
    setStatus(photos.length ? "loading" : "failed");
  }, [resetKey, photos.length]);

  useEffect(() => {
    const url = photoSrc(photos[safeIdx] || "");
    if (!url) {
      if (safeIdx < MAX_PHOTO_INDEX && safeIdx + 1 < photos.length) {
        setIdx(safeIdx + 1);
        return;
      }
      setStatus("failed");
      return;
    }

    let cancel = false;
    let settled = false;
    setStatus("loading");
    const img = new Image();
    img.referrerPolicy = "no-referrer";

    const skip = () => {
      if (cancel || settled) return;
      settled = true;
      if (retry < 1) {
        setRetry((n) => n + 1);
        return;
      }
      if (safeIdx < MAX_PHOTO_INDEX && safeIdx + 1 < photos.length) {
        setRetry(0);
        setIdx(safeIdx + 1);
        return;
      }
      setStatus("failed");
    };

    const timer = window.setTimeout(skip, PHOTO_WAIT_MS);
    img.onload = () => {
      if (cancel || settled) return;
      settled = true;
      window.clearTimeout(timer);
      setStatus("ready");
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      skip();
    };
    img.src = url;

    return () => {
      cancel = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
  }, [photos, safeIdx, retry, photos.length]);

  const go = (delta: number) => {
    if (photos.length <= 1) return;
    setRetry(0);
    setIdx((p) => (p + delta + photos.length) % photos.length);
  };

  return { safeIdx, go, status, src: photoSrc(photos[safeIdx] || "") };
}
