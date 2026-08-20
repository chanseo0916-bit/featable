import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
        <div style={{ position: "absolute", left: 14, top: 4, width: 37, height: 56, overflow: "hidden", display: "flex" }}>
          <img
            src="https://featable.kr/featable-logo.png"
            alt=""
            width="300"
            height="56"
            style={{ position: "absolute", left: 0, top: 0, width: 300, height: 56 }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
