import type { Metadata } from "next";
import { JsonLd, type SeoSchema } from "@/components/seo-json-ld";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_SOCIAL_IMAGE, SITE_URL } from "@/lib/site";
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
    images: [{
      url: SITE_SOCIAL_IMAGE,
      width: 1200,
      height: 630,
      alt: "Featable — 창업가가 세상에 발견되기 시작하는 곳.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Featable — 창업가와 신생 브랜드가 발견되는 곳",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  const websiteId = `${SITE_URL}/#website`;
  const organizationId = `${SITE_URL}/#organization`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/featable-logo.png`,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
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
        {children}
      </body>
    </html>
  );
}
