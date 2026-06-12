"use client";

import { useEffect, useState } from "react";

export const PHOTO_AUTO_INTERVAL_MS = 3000;

export function usePhotoCarousel(photos: string[], resetKey?: string) {
  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(idx, Math.max(0, photos.length - 1));

  useEffect(() => {
    setIdx(0);
  }, [resetKey]);

  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => {
      setIdx((p) => (p + 1) % photos.length);
    }, PHOTO_AUTO_INTERVAL_MS);
    return () => clearInterval(t);
  }, [photos.length, resetKey]);

  const go = (delta: number) => {
    if (photos.length <= 1) return;
    setIdx((p) => (p + delta + photos.length) % photos.length);
  };

  return { safeIdx, go };
}
