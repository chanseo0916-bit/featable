/** URL slug 유틸 — 영문/숫자/한글 허용, 공백은 하이픈 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
