import Link from "next/link";
import { GAME_PATH } from "@/lib/paths";

export default function TopBar({ title }: { title: string }) {
  return (
    <div className="relative z-30 max-w-lg lg:max-w-6xl mx-auto px-4 lg:px-6 pt-4 flex items-center gap-3">
      <Link
        href={GAME_PATH}
        className="w-9 h-9 grid place-items-center rounded-full bg-white border border-black/10 shadow-sm hover:bg-black/[0.04] text-foreground transition"
        aria-label="Ana sayfa"
      >
        ‹
      </Link>
      <span className="font-display font-bold text-foreground">{title}</span>
    </div>
  );
}
