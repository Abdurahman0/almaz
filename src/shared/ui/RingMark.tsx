interface RingMarkProps {
  size?: number;
  className?: string;
}

/** The Almaz ring: accent band + faceted gem. Strokes/fills come from theme tokens. */
export function RingMark({ size = 64, className = '' }: RingMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="rm-band" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-strong)" />
        </linearGradient>
      </defs>
      {/* band */}
      <circle cx="50" cy="60" r="26" stroke="url(#rm-band)" strokeWidth="7" />
      {/* prongs */}
      <path
        d="M42 36 L50 30 L58 36"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* faceted gem */}
      <path d="M50 6 L62 18 L50 34 L38 18 Z" fill="var(--muted-soft)" />
      <path
        d="M38 18 L62 18 M50 6 L50 34 M44 12 L56 24 M56 12 L44 24"
        stroke="var(--text-muted)"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <path d="M50 6 L62 18 L50 34 L38 18 Z" stroke="var(--text-muted)" strokeWidth="1.2" />
    </svg>
  );
}
