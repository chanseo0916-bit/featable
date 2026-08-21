import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Featable 피터블 — 창업가와 제품을 발견하는 곳",
    short_name: "피터블",
    description: "Featable(피터블)은 창업가, 브랜드, 제품, 스토리와 기회를 연결하는 발견 플랫폼입니다.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ko-KR",
    dir: "ltr",
    background_color: "#f5f1e9",
    theme_color: "#ef4125",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
