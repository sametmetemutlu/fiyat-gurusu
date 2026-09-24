import type { ReactNode } from "react";

/** Telefonda alt alta. Geniş ekranda ilan solda, tahmin sağda, sayfa kaymadan. */
export default function ClassicStage({
  header,
  timer,
  photo,
  chips,
  controls,
}: {
  header: ReactNode;
  timer: ReactNode;
  photo: ReactNode;
  chips: ReactNode;
  controls: ReactNode;
}) {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 lg:max-w-6xl lg:flex-1 lg:h-full lg:min-h-0 lg:px-6 lg:py-3 lg:overflow-hidden">
      <div className="lg:h-full lg:flex lg:flex-col lg:min-h-0">
        <div className="mb-3 shrink-0">{header}</div>
        <div className="lg:flex-1 lg:min-h-0 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5 lg:items-stretch">
          <div className="flex flex-col min-h-0 gap-3">
            <div className="shrink-0">{timer}</div>
            <div className="lg:flex-1 lg:min-h-0 lg:[&>div]:h-full lg:[&>div]:aspect-auto">{photo}</div>
            <div className="flex flex-wrap gap-2 shrink-0">{chips}</div>
          </div>
          <div className="mt-5 lg:mt-0 fg-card p-4 lg:min-h-0 lg:overflow-y-auto">{controls}</div>
        </div>
      </div>
    </div>
  );
}
