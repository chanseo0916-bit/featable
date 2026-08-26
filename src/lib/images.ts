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
 * 표지가 없는 글에는 placeholder()가 picsum.photos 랜덤 사진을 만들어 넣는다.
 * 목록 썸네일로는 무해하지만 og:image로 나가면 글과 무관한 사진이 공유되고,
 * 대량 생성 콘텐츠처럼 보인다. 공유용 이미지에서는 걸러낸다.
 */
export function isGeneratedPlaceholder(src: string | undefined | null): boolean {
  if (!src) return true;
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
