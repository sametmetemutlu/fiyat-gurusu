export default function RoundTimer({
  remaining,
  progress,
  urgent,
  total,
}: {
  remaining: number;
  progress: number;
  urgent: boolean;
  total: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted font-medium">Süre</span>
        <span
          className={`font-display font-bold tabular-nums ${
            urgent ? "text-red-600" : "text-foreground"
          }`}
        >
          {remaining}s
        </span>
      </div>
      <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            urgent ? "bg-red-500" : "bg-brand"
          }`}
          style={{ width: `${Math.max(0, progress * 100)}%` }}
        />
      </div>
      <div className="sr-only">
        {remaining} saniye kaldı, toplam {total} saniye
      </div>
    </div>
  );
}
