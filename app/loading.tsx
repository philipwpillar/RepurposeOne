function VoLogoMark() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      width="40"
      height="40"
      className="animate-pulse"
    >
      <path
        d="M6 20.5c3.2-9 16.6-9 19.8 0"
        stroke="url(#voLoadingMark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M10 22.5c2-5.4 10-5.4 12 0"
        stroke="url(#voLoadingMark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="16" cy="24.5" r="2.6" fill="url(#voLoadingMark)" />
    </svg>
  );
}

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <linearGradient
            id="voLoadingMark"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#2DD4BF" />
            <stop offset="0.55" stopColor="#6366F1" />
            <stop offset="1" stopColor="#E24BC4" />
          </linearGradient>
        </defs>
      </svg>
      <VoLogoMark />
      <span className="text-lg font-semibold tracking-tight">
        Voice<span className="text-primary">ora</span>
      </span>
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
