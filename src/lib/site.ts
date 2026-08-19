const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
const productionSiteUrl = "https://featable.kr";

/** 운영 빌드에 localhost 환경변수가 남아 있어도 공개 URL은 실제 도메인을 사용한다. */
export const SITE_URL = process.env.NODE_ENV === "production"
  ? configuredSiteUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredSiteUrl)
    ? configuredSiteUrl
    : productionSiteUrl
  : configuredSiteUrl || "http://localhost:3000";

export const SITE_NAME = "Featable";

export const SITE_DESCRIPTION =
  "초기 창업가의 제품, 이야기, 기회와 사람을 연결하는 큐레이션 플랫폼. 창업가가 세상에 발견되기 시작하는 곳.";

/** 파트너 제안 등 대외 연락처 — 실제 메일 주소 확정 시 여기만 바꾼다 */
export const CONTACT_EMAIL = "hello@featable.com";
