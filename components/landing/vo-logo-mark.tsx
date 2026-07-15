export function VoMarkDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: "absolute" }}
    >
      <defs>
        <linearGradient
          id="voMark"
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
  );
}

export function VoLogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      viewBox="0 4.4 32 32"
      fill="none"
      aria-hidden="true"
      width={size}
      height={size}
    >
      <path
        d="M6 20.5c3.2-9 16.6-9 19.8 0"
        stroke="url(#voMark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M10 22.5c2-5.4 10-5.4 12 0"
        stroke="url(#voMark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="16" cy="24.5" r="2.6" fill="url(#voMark)" />
    </svg>
  );
}
