import { ImageResponse } from "next/og";

export const alt = "Voiceora — one piece of content, every platform, your voice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0B0D14",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(60% 60% at 20% 20%, rgba(45,212,191,0.35), transparent 70%), radial-gradient(55% 60% at 65% 10%, rgba(99,102,241,0.40), transparent 70%), radial-gradient(60% 65% at 90% 40%, rgba(226,75,196,0.30), transparent 72%)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              color: "#F1F2F7",
              letterSpacing: "-0.02em",
            }}
          >
            Voiceora
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 700,
              color: "#F1F2F7",
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
              marginTop: 28,
            }}
          >
            One piece of content.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 700,
              color: "#F1F2F7",
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
            }}
          >
            Every platform.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
              backgroundImage:
                "linear-gradient(100deg,#2DD4BF 0%,#6366F1 52%,#E24BC4 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Your voice.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
