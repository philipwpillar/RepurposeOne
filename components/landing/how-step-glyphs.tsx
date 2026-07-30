/** Monoline glyphs for How-it-works - same stroke family as VoLogoMark (1.8, round caps). */

type GlyphProps = { size?: number };

export function VoiceGlyph({ size = 24 }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 12c2.4-6.8 12.6-6.8 15 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7.5 13.5c1.5-4 7.5-4 9 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="12" cy="15" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function InputGlyph({ size = 24 }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="3.5"
        width="12"
        height="15"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7 8h6M7 11.5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="12.5"
        y="12.5"
        width="7"
        height="7"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="14.8" cy="15" r="0.7" fill="currentColor" />
      <path
        d="M13.2 18.2l1.8-1.6 1.2 1.1 1.8-2.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FormatsGlyph({ size = 24 }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="5.5" r="1.6" fill="currentColor" />
      <path
        d="M12 7.2v3.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 10.6L6.2 16.2M12 10.6l5.8 5.6M12 10.6l-2.2 6.8M12 10.6l2.2 6.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="6.2" cy="16.2" r="1.5" fill="currentColor" />
      <circle cx="17.8" cy="16.2" r="1.5" fill="currentColor" />
      <circle cx="9.8" cy="17.4" r="1.5" fill="currentColor" />
      <circle cx="14.2" cy="17.4" r="1.5" fill="currentColor" />
    </svg>
  );
}
