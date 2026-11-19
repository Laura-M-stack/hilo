export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hilo-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7dd3fc" />
            <stop offset=".55" stopColor="#6ee7b7" />
            <stop offset="1" stopColor="#fcd34d" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="#14141f" />
        <path
          d="M18 44c0-14 8-8 14-14s2-14 14-14"
          fill="none"
          stroke="url(#hilo-logo)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="46" cy="46" r="4.5" fill="url(#hilo-logo)" />
      </svg>
      <span className="text-xl font-bold tracking-[-0.02em]">Hilo</span>
    </span>
  );
}
