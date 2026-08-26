import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME_DISPLAY, SITE_SOCIAL_IMAGE, SITE_URL } from "@/lib/site";

export type SeoSchema = Record<string, unknown>;

export function absoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, SITE_URL).toString();
}

export function entityId(path: string, fragment: string): string {
  return `${absoluteUrl(path)}#${fragment}`;
}

export function createDetailMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  indexable = true,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  indexable?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  // 표지가 없으면 og:image를 비우지 말고 사이트 기본 카드로 떨어뜨린다
  const imageUrl = image ? absoluteUrl(image) : SITE_SOCIAL_IMAGE;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type,
      siteName: SITE_NAME_DISPLAY,
      locale: "ko_KR",
      url,
      title,
      description,
      images: [{ url: imageUrl, alt: title }],
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): SeoSchema {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function JsonLd({ data }: { data: SeoSchema }): ReactNode {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
