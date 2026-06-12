import Link from "next/link";

export default function TopBar({ title }: { title: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 pt-5 flex items-center gap-3">
      <Link
        href="/"
        className="w-9 h-9 grid place-items-center rounded-full bg-white border border-black/10 shadow-sm hover:bg-black/[0.04] text-foreground transition"
        aria-label="Ana sayfa"
      >
        ‹
      </Link>
      <span className="font-display font-bold text-foreground">{title}</span>
    </div>
  );
}
