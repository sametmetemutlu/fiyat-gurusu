"use client";

import { useState } from "react";
import { usePhotoCarousel } from "@/hooks/usePhotoCarousel";

export default function PhotoGallery({
  photos,
  alt,
  resetKey,
}: {
  photos: string[];
  alt: string;
  resetKey?: string;
}) {
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const { safeIdx, go } = usePhotoCarousel(photos, resetKey ?? photos[0]);

  const valid = photos.filter((_, i) => !broken[i]);

  return (
    <div className="relative w-full aspect-[4/3] bg-black/5 rounded-2xl overflow-hidden select-none shadow-sm">
      {photos.length > 0 ? (
        <img
          src={photos[safeIdx]}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setBroken((b) => ({ ...b, [safeIdx]: true }))}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted">
          Görsel yok
        </div>
      )}

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Önceki"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white text-xl grid place-items-center backdrop-blur"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Sonraki"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white text-xl grid place-items-center backdrop-blur"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
      <div className="absolute top-2 right-2 text-xs bg-black/55 text-white px-2 py-1 rounded-full backdrop-blur">
        {safeIdx + 1}/{photos.length}
      </div>
      {valid.length === 0 && photos.length > 0 && (
        <div className="absolute inset-0 z-10 grid place-items-center text-muted bg-black/5">
          Görsel yüklenemedi
        </div>
      )}
    </div>
  );
}
