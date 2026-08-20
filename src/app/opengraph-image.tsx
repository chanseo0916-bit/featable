import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Featable — 창업가가 세상에 발견되기 시작하는 곳.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "featable-logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#111111",
          fontFamily: "Pretendard, Arial, sans-serif",
        }}
      >
        <img
          src={logoSrc}
          width={520}
          height={97}
          alt="Featable"
          style={{ objectFit: "contain" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative" }}>
          <span style={{ marginTop: 34, fontSize: 30, fontWeight: 500, color: "#69707a", letterSpacing: -1 }}>
            창업가가 세상에 발견되기 시작하는 곳.
          </span>
        </div>
      </div>
    ),
    size,
  );
}
