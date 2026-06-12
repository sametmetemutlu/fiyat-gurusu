export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="fgTag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2fd98b" />
          <stop offset="1" stopColor="#16a36a" />
        </linearGradient>
      </defs>
      <path
        d="M24.5 4.2 41 8.1c1.3.3 2.2 1.4 2.3 2.7l1 16.9c.1 1.2-.4 2.4-1.3 3.2L26.6 44.6a4 4 0 0 1-5.6 0L4.6 28.2a4 4 0 0 1 0-5.7L20.6 6.3a4 4 0 0 1 3.9-2.1Z"
        fill="url(#fgTag)"
      />
      <circle cx="33.5" cy="14.5" r="3.2" fill="#042015" opacity="0.85" />
      <text
        x="20.5"
        y="30.5"
        fontFamily="var(--font-fredoka), sans-serif"
        fontSize="17"
        fontWeight="700"
        fill="#042015"
        textAnchor="middle"
      >
        ₺
      </text>
    </svg>
  );
}

export function Logo({ size = "text-4xl" }: { size?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size === "text-5xl" ? 48 : 38} />
      <span className={`font-display font-bold tracking-tight ${size}`}>
        <span className="text-foreground">Fiyat</span>
        <span className="text-brand"> Gurusu</span>
      </span>
    </div>
  );
}
