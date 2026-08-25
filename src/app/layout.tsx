import type { Metadata } from "next";
import { JsonLd, type SeoSchema } from "@/components/seo-json-ld";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_NAME_DISPLAY, SITE_NAME_KO, SITE_SOCIAL_IMAGE, SITE_URL } from "@/lib/site";
import "pretendard/dist/web/static/pretendard.css";
import "./globals.css";
import { Suspense } from "react";
import { ActivityTracker } from "@/components/activity-tracker";
import { MobileBottomNavigation } from "@/components/mobile-bottom-navigation";
import { ScrollToTop } from "@/components/scroll-to-top";
import splitStageStyles from "@/components/board-split-stage.module.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME_DISPLAY,
  alternates: { canonical: "/" },
  authors: [{ name: SITE_NAME_DISPLAY, url: SITE_URL }],
  creator: SITE_NAME_DISPLAY,
  publisher: SITE_NAME_DISPLAY,
  category: "startup platform",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  keywords: SITE_KEYWORDS,
  formatDetection: { email: false, address: false, telephone: false },
  title: {
    default: `${SITE_NAME_DISPLAY} — 창업가와 신생 브랜드가 발견되는 곳`,
    template: `%s — ${SITE_NAME_DISPLAY}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME_DISPLAY,
    locale: "ko_KR",
    url: SITE_URL,
    title: `${SITE_NAME_DISPLAY} — 창업가와 신생 브랜드가 발견되는 곳`,
    description: SITE_DESCRIPTION,
    images: [{
      url: SITE_SOCIAL_IMAGE,
      width: 1200,
      height: 630,
      alt: "Featable 피터블 — 창업가가 세상에 발견되기 시작하는 곳.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME_DISPLAY} — 창업가와 신생 브랜드가 발견되는 곳`,
    description: SITE_DESCRIPTION,
    images: [SITE_SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "WvPybZNgj_iB4w7KI18qLe97bo3HwKCl-e0vJUJQoWE",
  },
};

export default function RootLayout({ children, board }: LayoutProps<"/">) {
  const websiteId = `${SITE_URL}/#website`;
  const organizationId = `${SITE_URL}/#organization`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        alternateName: [SITE_NAME_KO, SITE_NAME_DISPLAY],
        url: SITE_URL,
        logo: `${SITE_URL}/featable-logo.png`,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        alternateName: [SITE_NAME_KO, SITE_NAME_DISPLAY, "featable.kr"],
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "ko-KR",
        publisher: { "@id": organizationId },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  } satisfies SeoSchema;

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <JsonLd data={jsonLd} />
        <Suspense fallback={null}><ActivityTracker /></Suspense>
        <div className={splitStageStyles.stage}>
          <div className={splitStageStyles.page}>{children}</div>
          {board}
        </div>
        <ScrollToTop />
        <Suspense fallback={null}><MobileBottomNavigation /></Suspense>
      </body>
    </html>
  );
}
