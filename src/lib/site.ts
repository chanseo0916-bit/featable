/** 사이트 전역 상수 — 도메인 확정 시 .env의 NEXT_PUBLIC_SITE_URL만 바꾸면 된다 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Featable";

export const SITE_DESCRIPTION =
  "초기 창업가의 제품, 이야기, 기회와 사람을 연결하는 큐레이션 플랫폼. 창업가가 세상에 발견되기 시작하는 곳.";
