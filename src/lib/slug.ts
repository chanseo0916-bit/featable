/**
 * URL slug 유틸 — 영문/숫자만 허용, 공백은 하이픈.
 * 한글 등 비ASCII 문자는 제거한다: Cloudflare Workers의 정적 에셋 라우팅이
 * 비ASCII 동적 라우트 세그먼트를 제대로 처리하지 못해 404/500이 발생하기 때문
 * (예: /founders/이찬서-haj4). 호출부는 결과가 빈 문자열일 때를 대비해
 * `slugify(name) || "fallback"` 형태로 폴백을 둔다.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
