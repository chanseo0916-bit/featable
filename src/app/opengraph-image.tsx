import { ImageResponse } from "next/og";

export const alt = "FEATABLE — Discover founders, products, and stories";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          position: "relative",
          overflow: "hidden",
          background: "#f5f1e9",
          color: "#191816",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -170,
            right: -80,
            width: 470,
            height: 470,
            borderRadius: 235,
            background: "#ef4125",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 190,
            bottom: -180,
            width: 390,
            height: 390,
            borderRadius: 195,
            background: "#d7e54b",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              marginRight: 16,
              borderRadius: 12,
              background: "#ef4125",
              color: "#fff",
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            F
          </div>
          <span style={{ fontSize: 27, fontWeight: 800, letterSpacing: 5 }}>FEATABLE</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", position: "relative", maxWidth: 880 }}>
          <span style={{ color: "#ef4125", fontSize: 20, fontWeight: 800, letterSpacing: 4 }}>
            FOUNDERS · PRODUCTS · STORIES
          </span>
          <div style={{ display: "flex", fontSize: 70, fontWeight: 800, lineHeight: 1.06, marginTop: 22 }}>
            Discover what builders
          </div>
          <div style={{ display: "flex", fontSize: 70, fontWeight: 800, lineHeight: 1.06 }}>
            are making next.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative" }}>
          <span style={{ fontSize: 22, color: "#57534c" }}>
            A place to find the people and products behind the next idea.
          </span>
          <span style={{ fontSize: 22, fontWeight: 700 }}>featable.kr</span>
        </div>
      </div>
    ),
    size,
  );
}
