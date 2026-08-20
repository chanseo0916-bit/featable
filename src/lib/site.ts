import type { Metadata } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
const productionSiteUrl = "https://featable.kr";

/** 운영 빌드에 localhost 환경변수가 남아 있어도 공개 URL은 실제 도메인을 사용한다. */
export const SITE_URL = process.env.NODE_ENV === "production"
  ? productionSiteUrl
  : configuredSiteUrl || "http://localhost:3000";

export const SITE_NAME = "Featable";
export const SITE_SOCIAL_IMAGE = `${SITE_URL}/featable-og-v2.png`;

export const SITE_DESCRIPTION =
  "초기 사용자 확보를 고민하는 창업가를 위한 Featable. 신생 브랜드와 스타트업 제품, 창업가 인터뷰와 창업 지원사업·행사·커뮤니티를 한곳에서 만나보세요.";

export const SITE_KEYWORDS = [
  "Featable",
  "피처블",
  "초기 사용자 확보",
  "창업가 인터뷰",
  "신생 브랜드",
  "스타트업 제품",
  "창업 지원사업",
  "창업 행사",
  "창업 커뮤니티",
];

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}`;
};

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataOptions): Metadata {
  const pageTitle = `${title} — ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ko_KR",
      url: new URL(path, SITE_URL).toString(),
      title: pageTitle,
      description,
      images: [{
        url: SITE_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: "Featable — 창업가가 세상에 발견되기 시작하는 곳.",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [SITE_SOCIAL_IMAGE],
    },
  };
}

/** 파트너 제안 등 대외 연락처 — 실제 메일 주소 확정 시 여기만 바꾼다 */
export const CONTACT_EMAIL = "hello@featable.com";
