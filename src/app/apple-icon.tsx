import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div style={{ position: "absolute", left: 47, top: 24, width: 87, height: 132, overflow: "hidden", display: "flex" }}>
          <img
            src="https://featable.kr/featable-logo.png"
            alt=""
            width="707"
            height="132"
            style={{ position: "absolute", left: 0, top: 0, width: 707, height: 132 }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
