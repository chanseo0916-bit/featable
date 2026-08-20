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
