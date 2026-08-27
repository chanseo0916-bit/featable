/**
 * Supabase custom-domain storage is public, but some edge image optimizers reject
 * the alias before a fresh deployment/config propagation. In that case the
 * browser should request the original image directly instead of `/_next/image`.
 */
export function bypassImageOptimization(src: string) {
  try {
    return new URL(src).hostname === "auth.featable.kr";
  } catch {
    return false;
  }
}

/**
 * 예전 데이터에 남아 있는 picsum.photos placeholder를 식별한다.
 * 목록에서는 빈 이미지 폴백을 사용하고, 공유용 이미지에서는 외부 placeholder를 걸러낸다.
 */
export function isGeneratedPlaceholder(src: string | undefined | null): boolean {
  if (!src) return true;
  if (src === "/image-fallback.svg") return true;
  try {
    return new URL(src).hostname === "picsum.photos";
  } catch {
    return false;
  }
}

/** 진짜 표지가 있을 때만 반환한다. 없으면 undefined → 사이트 기본 OG 이미지로 떨어진다 */
export function shareableImage(...candidates: Array<string | undefined | null>): string | undefined {
  return candidates.find((src) => src && !isGeneratedPlaceholder(src)) ?? undefined;
}
