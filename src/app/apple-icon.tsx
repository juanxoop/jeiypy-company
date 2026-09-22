import { ImageResponse } from "next/og";
import { MarkImage } from "@/components/brand/MarkImage";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E1420" }}>
        <MarkImage size={150} tile={false} />
      </div>
    ),
    size,
  );
}
