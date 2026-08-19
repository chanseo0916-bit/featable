import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/site";
import "pretendard/dist/web/static/pretendard.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "startup platform",
  keywords: SITE_KEYWORDS,
  formatDetection: { email: false, address: false, telephone: false },
  title: {
    default: "Featable — 창업가와 신생 브랜드가 발견되는 곳",
    template: "%s — Featable",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    url: SITE_URL,
    title: "Featable — 창업가와 신생 브랜드가 발견되는 곳",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
