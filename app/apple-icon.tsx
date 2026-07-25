import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          backgroundImage:
            "linear-gradient(135deg,#2DD4BF 0%,#6366F1 52%,#E24BC4 100%)",
          color: "#FFFFFF",
          fontSize: 110,
          fontWeight: 700,
        }}
      >
        V
      </div>
    ),
    { ...size },
  );
}
