import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Featable — 창업가가 세상에 발견되기 시작하는 곳",
  description: "초기 창업가의 제품, 이야기, 기회와 사람을 연결하는 큐레이션 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
