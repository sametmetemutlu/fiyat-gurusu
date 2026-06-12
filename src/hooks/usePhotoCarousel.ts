"use client";

import { useEffect, useState } from "react";

export function usePhotoCarousel(photos: string[], resetKey?: string) {
  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(idx, Math.max(0, photos.length - 1));

  useEffect(() => {
    setIdx(0);
  }, [resetKey]);

  const go = (delta: number) => {
    if (photos.length <= 1) return;
    setIdx((p) => (p + delta + photos.length) % photos.length);
  };

  return { safeIdx, go };
}
