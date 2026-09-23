import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = siteConfig.seo.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const isotipo = await readFile(join(process.cwd(), "src/assets/brand/jp-isotipo.png"));
  const isotipoSrc = `data:image/png;base64,${isotipo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "radial-gradient(ellipse 80% 70% at 80% 0%, #0D2A6B 0%, #0A1224 45%, #05070B 100%)",
          color: "#F5F7FA",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={isotipoSrc} width={88} height={88} alt="" />
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>{siteConfig.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>Lleva tu negocio al mundo digital.</span>
          <span style={{ fontSize: 30, color: "#8994A7" }}>{siteConfig.seo.description}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#54A8FF", letterSpacing: 4, textTransform: "uppercase" }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, background: "#54A8FF" }} />
          {siteConfig.slogan}
        </div>
      </div>
    ),
    size,
  );
}
